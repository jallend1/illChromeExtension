import {
  getBaseURL,
  focusOrCreateTab,
  isAllowedHost,
  getActiveTab,
  isEvgMobile,
} from "./background-utils.js";
import { injectDymoFramework } from "./modules/dymoFunctions.js";
import { URLS } from "./modules/constants.js";
import {
  createTabWithScript,
  executeScript,
} from "./modules/scriptExecutor.js";

let openSidepanels = {};

/**
 * Calculates URL and opens/focuses tab
 * @param {string} urlSuffix
 * @returns {Promise<void>}
 * @description This function constructs a URL based on the provided suffix,
 * retrieves the base URL, and then opens or focuses a tab with that URL.
 */
const calculateURL = async (urlSuffix) => {
  const baseUrl = await getBaseURL(urlSuffix);
  await focusOrCreateTab(baseUrl);
};

/**
 * Opens patron retrieval page
 * @returns {Promise<void>}
 * @description This function checks if mobile Evergreen is used and constructs the patron retrieval URL accordingly.
 * It then opens a new tab with the patron retrieval script.
 */
const retrievePatron = async () => {
  const baseUrl = (await isEvgMobile()) ? URLS.MOBILE_BASE : URLS.CLIENT_BASE;
  const url = `${baseUrl}${URLS.PATRON_SEARCH}`;

  createTabWithScript(url, "retrievePatron");
};

/**
 * Handles sidepanel messages
 * @param {Object} request
 * @returns {boolean}
 * @description This function handles sidepanel open/close messages to manage the openSidepanels state,
 * and to prevent errors with background.js intercepting the addressReady message intended for sidepanel.
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
  if (request.type === "addressReady") {
    // Message is handled by sidePanel, but this bad boy keeps intercepting it
    return true;
  }
  return false;
};

/**
 * Handles WorldShare tab switching
 * @param {Object} request
 * @returns {boolean}
 * @description This function checks if the request is to find and switch to a WorldShare tab.
 * If found, it switches to that tab and executes a specified script after a short delay.
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
          executeScript(worldShareTab.id, request.scriptToRelaunch);
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
    sendResponse({ success: true });
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
  console.log("=== MESSAGE HANDLER DEBUG ===");
  console.log("Request:", request);
  console.log("Sender:", sender);
  console.log(
    "Kinokuniya search command?",
    request.command === "openKinokuniyaSearch"
  );

  // Handle sidepanel messages first (no need for active tab)
  if (handleSidepanelMessage(request)) {
    console.log("Handled as sidepanel message");
    return;
  }

  // Handle WorldShare messages (no need for active tab validation)
  if (handleWorldShareMessage(request)) {
    console.log("Handled as WorldShare message");
    return;
  }

  // Handle Kinokuniya search FIRST - before any tab validation
  if (request.command === "openKinokuniyaSearch") {
    console.log("Handling Kinokuniya search - no tab validation needed");
    try {
      console.log(
        `Background: Opening Kinokuniya search for: ${request.searchTerm}`
      );

      // Build search URL using the same logic as your Python script
      const cleanTerm = String(request.searchTerm)
        .replace(/-/g, "")
        .replace(/\s+/g, "+");

      const searchUrl = `https://united-states.kinokuniya.com/products?utf8=%E2%9C%93&is_searching=true&restrictBy%5Bavailable_only%5D=1&keywords=${cleanTerm}&taxon=&x=0&y=0`;

      console.log(`Opening URL: ${searchUrl}`);

      // Create a new tab with the search URL
      await chrome.tabs.create({
        url: searchUrl,
        active: true, // Make it the active tab so user can see results
      });

      console.log("Successfully opened Kinokuniya search tab");
    } catch (error) {
      console.error("Error opening Kinokuniya search:", error);
    }
    return true;
  }

  // For all other messages, get active tab and validate
  console.log("Getting active tab for validation...");
  const activeTab = await getActiveTab();
  console.log("Active tab result:", activeTab);

  if (!activeTab) {
    console.error("No active tab available for message:", request);
    return;
  }

  console.log("Active tab URL:", activeTab.url);
  console.log("Request type/command/action:", {
    type: request.type,
    command: request.command,
    action: request.action,
    data: request.data,
  });

  const isKinokuniyaRelated =
    activeTab.url?.includes("kinokuniya.com") ||
    request.command?.includes("kinokuniya") ||
    request.action?.includes("kinokuniya");

  console.log("Is Kinokuniya related:", isKinokuniyaRelated);
  console.log("Is allowed host:", isAllowedHost(activeTab.url));

  if (!isKinokuniyaRelated && !isAllowedHost(activeTab.url)) {
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
