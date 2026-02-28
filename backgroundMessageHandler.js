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
  executeScript,
  reuseTabOrCreateWithScript,
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
 * It reuses an existing non-active Evergreen tab if available, otherwise creates a new tab.
 */
const retrievePatron = async () => {
  const baseUrl = (await isEvgMobile()) ? URLS.MOBILE_BASE : URLS.CLIENT_BASE;
  const url = `${baseUrl}${URLS.PATRON_SEARCH}`;

  reuseTabOrCreateWithScript(url, "retrievePatron");
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
      (tab) => tab.url && tab.url.includes("share.worldcat.org"),
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
  if (["editPatron", "retrieveOnly", "retrievePatron"].includes(request.action)) {
    // retrievePatron carries a full request object; the barcode-only actions just need the barcode
    const isFullRequest = request.action === "retrievePatron";
    chrome.storage.local.set(
      isFullRequest ? { request } : { patronBarcode: request.patronBarcode },
      () => console.log(isFullRequest ? "Request data stored" : "Patron barcode stored"),
    );
    retrievePatron();
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "isbnSearch") {
    await calculateURL(URLS.CATALOG + "/" + request.url);
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
      },
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
      },
    );
    return true;
  }

  return false;
};

/**
 * Shared handler for vendor price-result messages (Kinokuniya, KingStone).
 * Looks up the original ISBN from session storage, forwards the result to the
 * sidepanel, cleans up, and closes the tab when running in bulk mode.
 * @param {string} vendor - Storage key prefix, e.g. "kinokuniya" or "kingStone"
 * @param {Object} request
 * @param {chrome.runtime.MessageSender} sender
 */
const handleVendorResult = (vendor, request, sender) => {
  const tabId = sender.tab?.id;
  if (!tabId) {
    console.error(`Background: No tab ID in sender for ${vendor}!`);
    return;
  }

  const storageKey = `${vendor}_${tabId}`;
  chrome.storage.session.get([storageKey], (result) => {
    const isbn = result[storageKey] || request.isbn || "";
    const isBulkMode = !!result[storageKey];

    console.log(`Background: ${vendor} ISBN from storage: ${isbn}, bulk mode: ${isBulkMode}`);

    const messageToSend = {
      command: `${vendor}Result`,
      found: request.found,
      url: request.url,
      price: request.price,
      isbn,
      extractedIsbn: request.isbn || "",
    };
    console.log(`Background: Forwarding ${vendor} result:`, messageToSend);

    chrome.runtime.sendMessage(messageToSend);
    chrome.storage.session.remove([storageKey]);

    if (isBulkMode) {
      console.log(`Background: Closing ${vendor} tab ${tabId} in 500ms`);
      setTimeout(() => chrome.tabs.remove(tabId), 500);
    }
  });
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
            `Background: Tab ${tabId} loaded: ${tab.url}, status: ${info.status}`,
          );

          // Check what kind of page we're on
          if (tab.url.includes("/products?") && !hasInjectedSearchScript) {
            // Search results page - inject kinokuniyaSearchResults
            console.log(
              "Background: Detected search results page, injecting kinokuniyaSearchResults.js",
            );
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
            console.log(
              "Background: Detected product page, injecting kinokuniyaProductPage.js",
            );
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

  // Handle KingStone search - before any tab validation
  if (request.command === "openKingStoneSearch") {
    try {
      const cleanTerm = String(request.searchTerm).replace(/-/g, "").trim();
      const bulkMode = request.bulkMode || false;
      const originalIsbn = request.searchTerm;

      // Navigate to KingStone homepage (where the search form lives)
      const newTab = await chrome.tabs.create({
        url: "https://www.kingstonebook.com/",
        active: !bulkMode,
      });

      if (bulkMode) {
        chrome.storage.session.set({
          [`kingStone_${newTab.id}`]: originalIsbn,
        });
      }

      let hasSubmittedSearch = false;
      let listenerTimeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
      }, 40000);

      function listener(tabId, info, tab) {
        if (tabId === newTab.id && info.status === "complete") {
          console.log(
            `Background: KingStone tab ${tabId} loaded: ${tab.url}`,
          );

          if (!hasSubmittedSearch) {
            // First load (homepage) - fill the real search form and submit
            hasSubmittedSearch = true;
            console.log("Background: Filling KingStone search form on homepage");
            chrome.scripting
              .executeScript({
                target: { tabId: newTab.id },
                func: (searchTerm) => {
                  const input = document.querySelector(
                    'input[name="searchText"]',
                  );
                  if (input) {
                    input.value = searchTerm;
                    const form = input.closest("form");
                    if (form) {
                      form.submit();
                    }
                  }
                },
                args: [cleanTerm],
              })
              .catch((err) => {
                console.error("Error filling KingStone search form:", err);
              });
          } else {
            // Second load (results page) - extract results
            console.log(
              "Background: Injecting kingStoneSearchResults.js",
            );
            clearTimeout(listenerTimeout);
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.scripting
              .executeScript({
                target: { tabId: newTab.id },
                files: ["./scripts/kingStoneSearchResults.js"],
              })
              .catch((err) => {
                console.error("Error injecting kingStoneSearchResults:", err);
              });
          }
        }
      }

      chrome.tabs.onUpdated.addListener(listener);
    } catch (error) {
      console.error("Error opening KingStone search:", error);
    }
    return true;
  }

  // Handle legacy kinokuniyaResults message (for backwards compatibility)
  if (request.type === "kinokuniyaResults") {
    console.log("Received legacy kinokuniyaResults message:", request);
    return true;
  }

  // Handle vendor price-result messages from content scripts
  if (request.command === "kinokuniyaResult") {
    console.log("Background: Received kinokuniya result:", request);
    handleVendorResult("kinokuniya", request, sender);
    return true;
  }

  if (request.command === "kingStoneResult") {
    console.log("Background: Received KingStone result:", request);
    handleVendorResult("kingStone", request, sender);
    return true;
  }

  // For all other messages, get active tab and validate

  const activeTab = await getActiveTab();

  if (!activeTab) {
    console.error("No active tab available for message:", request);
    return;
  }

  const isVendorRelated =
    activeTab.url?.includes("kinokuniya.com") ||
    activeTab.url?.includes("kingstonebook.com") ||
    request.command?.includes("kinokuniya") ||
    request.command?.includes("kingStone") ||
    request.action?.includes("kinokuniya") ||
    request.action?.includes("kingStone");

  if (!isVendorRelated && !isAllowedHost(activeTab.url)) {
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
