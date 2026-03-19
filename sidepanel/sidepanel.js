import { elements, storageKeys, MESSAGE_TYPES } from "./lib/constants.js";
import {
  handleMessage,
  initializeMessageHandler,
  setCurrentTabUrl,
} from "./lib/messageHandler.js";
import { handleURLChange } from "./lib/buttonManager.js";
import { initializeEventListeners } from "./lib/eventListeners.js";

// The window ID for this istance of the side panel
let myWindowId = null;

/**
 * Retrieves the extension version from the manifest and displays it in the UI.
 * @returns {void}
 */
const retrieveExtensionVersion = () => {
  const manifestData = chrome.runtime.getManifest();
  const version = document.querySelector("#version");
  version.textContent = `v${manifestData.version}`;
};

retrieveExtensionVersion();

/**
 * Set up window tracking and messaging
 */
const setupWindow = () => {
  chrome.windows.getCurrent((currentWindow) => {
    myWindowId = currentWindow.id;

    // Initialize message handler with window ID
    initializeMessageHandler(myWindowId);

    // Notify background of sidepanel opening
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SIDEPANEL_OPEN,
      windowId: myWindowId,
    });

    // Handle sidepanel closing
    window.addEventListener("unload", () => {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.SIDEPANEL_CLOSE,
        windowId: myWindowId,
      });
    });
  });
};

/**
 * Initialize storage values for UI elements — single batched read
 */
const initializeStorageValues = () => {
  const keys = storageKeys.map(({ key }) => key);
  chrome.storage.local.get(keys, (result) => {
    storageKeys.forEach(({ key, element }) => {
      if (element) element.checked = result[key];
    });
  });
};

/**
 * Get and monitor current tab
 */
const initializeCurrentTab = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const currentTabUrl = tabs[0].url;
      setCurrentTabUrl(currentTabUrl);
      handleURLChange(currentTabUrl);
    }
  });
};

/**
 * Directly monitor tab switches and navigations from the sidepanel,
 * rather than relying on the background service worker to relay them.
 * The service worker can be terminated at any time in MV3, causing it
 * to lose the openSidepanels state and silently drop URL updates.
 */
const setupTabListeners = () => {
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    if (myWindowId === null || activeInfo.windowId !== myWindowId) return;
    const tab = await chrome.tabs.get(activeInfo.tabId);
    setCurrentTabUrl(tab.url);
    handleURLChange(tab.url);
  });

  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (myWindowId === null || tab.windowId !== myWindowId) return;
    if (!tab.active || changeInfo.status !== "complete") return;
    setCurrentTabUrl(tab.url);
    handleURLChange(tab.url);
  });
};

/**
 * Fire up all systems
 */
const initializeApp = () => {
  try {
    setupWindow();
    setupTabListeners();
    chrome.runtime.onMessage.addListener(handleMessage);
    initializeEventListeners();
    initializeStorageValues();
    initializeCurrentTab();
  } catch (error) {
    console.error("Failed to initialize sidepanel:", error);
  }
};

// Start the application
initializeApp();
