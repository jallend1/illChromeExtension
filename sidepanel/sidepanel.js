import { elements, storageKeys, MESSAGE_TYPES } from "./constants.js";
import {
  handleMessage,
  initializeMessageHandler,
  setCurrentTabUrl,
} from "./messageHandler.js";
import { handleURLChange } from "./buttonManager.js";
import { initializeEventListeners } from "./eventListeners.js";
import { getStorageValue } from "./utils.js";

// The window ID for this istance of the side panel
let myWindowId = null;

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
 * Initialize storage values for UI elements
 */
const initializeStorageValues = () => {
  storageKeys.forEach((storageKey) => {
    getStorageValue(storageKey.key, storageKey.element);
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
 * Fire up all systems
 */
const initializeApp = () => {
  try {
    setupWindow();
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
