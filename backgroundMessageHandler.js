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
import { handleSidepanelMessage } from "./modules/sidepanelCommunication.js";

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
  // TODO: Clean up logic -- editPatron/retriveOnly/retrievePatron duplicating a lot of functionality
  if (request.action === "editPatron" || request.action == "retrieveOnly") {
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
  // console.log(
  //   "Kinokuniya search command?",
  //   request.command === "openKinokuniyaSearch"
  // );

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
    try {
      // Build search URL
      const cleanTerm = String(request.searchTerm)
        .replace(/-/g, "")
        .replace(/\s+/g, "+");

      const searchUrl = `https://united-states.kinokuniya.com/products?utf8=%E2%9C%93&is_searching=true&restrictBy%5Bavailable_only%5D=1&keywords=${cleanTerm}&taxon=&x=0&y=0`;

      // Store the ISBN/search term with the tab so we can track it
      const bulkMode = request.bulkMode || false;
      const originalIsbn = request.searchTerm;

      // Create a new tab with the search URL and capture the tab object
      const newTab = await chrome.tabs.create({
        url: searchUrl,
        active: !bulkMode, // Don't focus tab if in bulk mode
      });

      // Store mapping of tab ID to ISBN for later
      if (bulkMode) {
        chrome.storage.session.set({
          [`kinokuniya_${newTab.id}`]: originalIsbn,
        });
      }

      // Listen for page loads to inject scripts
      // This handles both the search results page and the product page after navigation
      let hasInjectedSearchScript = false;
      let listenerTimeout = setTimeout(() => {
        // Cleanup listener after 40 seconds if nothing happened
        chrome.tabs.onUpdated.removeListener(listener);
      }, 40000);

      function listener(tabId, info, tab) {
        if (tabId === newTab.id && info.status === "complete") {
          console.log(
            `Background: Tab ${tabId} loaded: ${tab.url}, status: ${info.status}`
          );

          // Check what kind of page we're on
          if (tab.url.includes("/products?") && !hasInjectedSearchScript) {
            // Search results page - inject kinokuniyaSearchResults
            console.log("Background: Detected search results page, injecting kinokuniyaSearchResults.js");
            hasInjectedSearchScript = true;
            chrome.scripting
              .executeScript({
                target: { tabId: newTab.id },
                files: ["./scripts/kinokuniyaSearchResults.js"],
              })
              .catch((err) => {
                console.error("Error injecting kinokuniyaSearchResults:", err);
              });
          } else if (
            (tab.url.includes("/products/") || tab.url.includes("/bw/")) &&
            !tab.url.includes("?")
          ) {
            // Product page - inject kinokuniyaProductPage to extract price
            console.log("Background: Detected product page, injecting kinokuniyaProductPage.js");
            clearTimeout(listenerTimeout);
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.scripting
              .executeScript({
                target: { tabId: newTab.id },
                files: ["./scripts/kinokuniyaProductPage.js"],
              })
              .catch((err) => {
                console.error("Error injecting kinokuniyaProductPage:", err);
              });
          }
        }
      }

      chrome.tabs.onUpdated.addListener(listener);
    } catch (error) {
      console.error("Error opening Kinokuniya search:", error);
    }
    return true;
  }

  // Handle legacy kinokuniyaResults message (for backwards compatibility)
  if (request.type === "kinokuniyaResults") {
    console.log("Received legacy kinokuniyaResults message:", request);
    return true;
  }

  // Handle Kinokuniya result messages from content script
  if (request.command === "kinokuniyaResult") {
    console.log("Background: Received kinokuniya result:", request);
    console.log("Background: Sender tab ID:", sender.tab?.id);

    // Get the ISBN from session storage if available
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.storage.session.get([`kinokuniya_${tabId}`], (result) => {
        const isbn = result[`kinokuniya_${tabId}`] || request.isbn || "";
        const isBulkMode = !!result[`kinokuniya_${tabId}`];

        console.log(
          `Background: ISBN from storage: ${isbn}, bulk mode: ${isBulkMode}`
        );

        // Forward to all open sidepanels
        const messageToSend = {
          command: "kinokuniyaResult",
          found: request.found,
          url: request.url,
          price: request.price,
          isbn: isbn, // This is the original search term from storage
          extractedIsbn: request.isbn || "", // This is the ISBN extracted from the page
        };
        console.log("Background: Forwarding to sidepanel:", messageToSend);

        chrome.runtime.sendMessage(messageToSend);

        // Clean up session storage
        chrome.storage.session.remove([`kinokuniya_${tabId}`]);

        // Close the tab after a short delay only if in bulk mode
        if (isBulkMode) {
          console.log(`Background: Closing tab ${tabId} in 500ms`);
          setTimeout(() => {
            chrome.tabs.remove(tabId);
          }, 500);
        }
      });
    } else {
      console.error("Background: No tab ID in sender!");
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

  // console.log("Is Kinokuniya related:", isKinokuniyaRelated);
  // console.log("Is allowed host:", isAllowedHost(activeTab.url));

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
