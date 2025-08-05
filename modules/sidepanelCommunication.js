import { openSidepanels } from "../backgroundMessageHandler.js";

/**
 * Checks if any sidepanel is open
 * @returns {boolean}
 */
export const isAnySidepanelOpen = () => {
  return Object.keys(openSidepanels).length > 0;
};

/**
 * Sends tab URL update to sidepanel
 * @param {object} details - Object with tabId, url, and windowId properties
 */
export const sendTabUrlUpdate = (details) => {
  if (!isAnySidepanelOpen() || !openSidepanels[details.windowId]) {
    return;
  }

  chrome.runtime.sendMessage(
    {
      type: "tab-url-updated",
      tabId: details.tabId,
      url: details.url,
      windowId: details.windowId,
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error sending tab URL update:",
          chrome.runtime.lastError
        );
      }
    }
  );
};
