import { isAllowedHost, getActiveTab } from "../background-utils.js";

/**
 * Manages lending mode state and updates
 * @param {Function} executeScript
 */
export const initializeLendingMode = async (executeScript) => {
  chrome.storage.local.get("lendingMode", async (result) => {
    if (result.lendingMode) {
      const activeTab = await getActiveTab();
      if (activeTab) {
        if (!isAllowedHost(activeTab.url)) return;
        executeScript(activeTab.id, "frequentLending");
      }
    }
  });
};

/**
 * Handles storage changes
 * @param {object} changes
 * @param {string} area
 */
export const handleStorageChanges = (changes, area) => {
  if (area === "local") {
    chrome.runtime.sendMessage({
      type: "storage-updated",
      changes: changes,
    });

    // If changes include lendingMode, update it on all open tabs
    if (changes.lendingMode) {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (isAllowedHost(tab.url)) {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ["./scripts/frequentLending.js"],
            });
          }
        });
      });
    }
  }
};

/**
 * Gets and manages passive tools state
 * @returns {Promise<boolean>}
 */
export const getPassiveToolsState = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get("arePassiveToolsActive", (result) => {
      resolve(result.arePassiveToolsActive);
    });
  });
};
