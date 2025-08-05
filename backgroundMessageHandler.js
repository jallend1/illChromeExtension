import {
  getBaseURL,
  focusOrCreateTab,
  isAllowedHost,
  URLS,
  getActiveTab,
} from "./background-utils.js";
import { injectDymoFramework } from "./modules/dymoFunctions.js";

let openSidepanels = {};

/**
 * Calculates URL and opens/focuses tab
 * @param {string} urlSuffix
 */
const calculateURL = async (urlSuffix) => {
  const baseUrl = await getBaseURL(urlSuffix);
  await focusOrCreateTab(baseUrl);
};

/**
 * Opens patron retrieval page
 */
const retrievePatron = async () => {
  const baseUrl = (await isEvgMobile()) ? URLS.MOBILE_BASE : URLS.CLIENT_BASE;
  const url = `${baseUrl}${URLS.PATRON_SEARCH}`;

  chrome.tabs.create(
    {
      url: url,
      active: true,
    },
    (newTab) => {
      if (!newTab) {
        console.error("Failed to create a new tab.");
        return;
      }
      const onTabUpdated = (tabId, changeInfo, tab) => {
        if (tabId === newTab.id && changeInfo.status === "complete") {
          chrome.scripting.executeScript(
            {
              target: { tabId: newTab.id },
              files: ["./scripts/retrievePatron.js"],
            },
            async () => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Error executing script:",
                  chrome.runtime.lastError.message
                );
              }
              // Get the latest tab info to ensure correct URL and windowId
              const updatedTab = await chrome.tabs.get(newTab.id);
              chrome.runtime.sendMessage({
                type: "tab-url-updated",
                tabId: updatedTab.id,
                url: updatedTab.url,
                windowId: updatedTab.windowId,
              });
            }
          );
          chrome.tabs.onUpdated.removeListener(onTabUpdated);
        }
      };
      chrome.tabs.onUpdated.addListener(onTabUpdated);
    }
  );
};

/**
 * Handles sidepanel open/close messages to manage openSidepanels state
 * @param {Object} request
 */
const handleSidepanelMessage = (request) => {
  if (request.type === "sidepanel-open") {
    openSidepanels[request.windowId] = true;
    return true;
  }
  if (request.type === "sidepanel-close") {
    delete openSidepanels[request.windowId];
    return true;
  }
  return false;
};

/**
 * Handles WorldShare tab switching
 * @param {Object} request
 */
const handleWorldShareMessage = (request) => {
  if (request.type !== "findAndSwitchToWorldShare") return false;

  chrome.tabs.query({}, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error("Error querying tabs:", chrome.runtime.lastError);
      return;
    }
    const worldShareTab = tabs.find(
      (tab) => tab.url && tab.url.includes("share.worldcat.org")
    );
    if (worldShareTab && worldShareTab.id) {
      // Switches to WorldShare tab
      chrome.tabs.update(worldShareTab.id, { active: true }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error("Error activating tab:", chrome.runtime.lastError);
          return;
        }
        // Waits a hot second before executing script
        setTimeout(() => {
          chrome.scripting.executeScript(
            {
              target: { tabId: worldShareTab.id },
              files: [`./scripts/${request.scriptToRelaunch}.js`],
            },
            () => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Error executing script:",
                  chrome.runtime.lastError
                );
              }
            }
          );
        }, 100);
      });
    } else {
      console.log("No WorldShare tab found in", tabs.length, "tabs");
    }
  });
  return true;
};

/**
 * Handles command-type messages
 * @param {Object} request
 * @param {chrome.tabs.Tab} activeTab
 */
const handleCommandMessage = async (request, activeTab) => {
  if (request.command === "toggleExtension") {
    chrome.storage.local.get("arePassiveToolsActive", (result) => {
      // This just retrieves the value - the actual toggling happens elsewhere
    });
    return true;
  }

  if (request.command === "disableButton") {
    chrome.management.getSelf((extensionInfo) => {
      chrome.tabs.reload(activeTab.id);
      chrome.management.setEnabled(extensionInfo.id, false, () => {
        console.log("Extension disabled.");
      });
    });
    return true;
  }

  if (request.command === "openCreateILL") {
    await calculateURL(URLS.CREATE_ILL);
    return true;
  }

  return false;
};

/**
 * Handles action-type messages
 * @param {Object} request
 * @param {chrome.tabs.Tab} activeTab
 * @param {Function} sendResponse
 */
const handleActionMessage = async (request, activeTab, sendResponse) => {
  if (request.action === "editPatron") {
    // Store patron barcode in local storage
    chrome.storage.local.set({ patronBarcode: request.patronBarcode }, () => {
      console.log("Patron barcode stored");
    });
    // Open the patron page in a new tab
    retrievePatron();
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "isbnSearch") {
    await calculateURL(URLS.CATALOG + "/" + request.url);
    return true;
  }

  if (request.action === "retrievePatron") {
    chrome.storage.local.set({ request }, () => {
      console.log("Request Data stored", request);
    });
    retrievePatron();
    return true;
  }

  return false;
};

/**
 * Handles data-type messages
 * @param {Object} request
 * @param {chrome.tabs.Tab} activeTab
 * @param {Function} sendResponse
 */
const handleDataMessage = (request, activeTab, sendResponse) => {
  if (request.data === "copyWorldShareAddress") {
    injectDymoFramework(activeTab.id);
    // Also execute the script like other data messages
    chrome.scripting.executeScript(
      {
        target: { tabId: activeTab.id },
        files: [`./scripts/${request.data}.js`],
      },
      () => {
        sendResponse({ success: true });
      }
    );
    return true;
  }

  if (request.data) {
    chrome.scripting.executeScript(
      {
        target: { tabId: activeTab.id },
        files: [`./scripts/${request.data}.js`],
      },
      () => {
        sendResponse({ response: "Message received" });
      }
    );
    return true;
  }

  return false;
};

/**
 * Main message handler function
 * @param {Object} request
 * @param {chrome.runtime.MessageSender} sender
 * @param {Function} sendResponse
 */
export const handleMessage = async (request, sender, sendResponse) => {
  // Handle sidepanel messages first (no need for active tab)
  if (handleSidepanelMessage(request)) {
    return;
  }

  // Handle WorldShare messages (no need for active tab validation)
  if (handleWorldShareMessage(request)) {
    return;
  }

  // For all other messages, get active tab and validate
  const activeTab = await getActiveTab();
  if (!activeTab) {
    console.error("No active tab available for message:", request);
    return;
  }

  if (!isAllowedHost(activeTab.url)) {
    console.log("Message ignored - not on allowed host:", activeTab.url);
    return;
  }

  // Handle different message types
  try {
    if (await handleCommandMessage(request, activeTab)) {
      return;
    }

    if (await handleActionMessage(request, activeTab, sendResponse)) {
      return true; // Keep message port open for async response
    }

    if (handleDataMessage(request, activeTab, sendResponse)) {
      return true; // Keep message port open for async response
    }

    // If we get here, the message type wasn't recognized
    console.warn("Unhandled message type:", request);
  } catch (error) {
    console.error("Error handling message:", error, request);
  }

  return true; // Keep message channel open
};
