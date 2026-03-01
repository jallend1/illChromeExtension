let openSidepanels = {};

/**
 * Checks if any sidepanel is open
 * @returns {boolean}
 */
export const isAnySidepanelOpen = () => {
  return Object.keys(openSidepanels).length > 0;
};

/**
 * Handles sidepanel open/close messages
 * @param {Object} request
 */
export const handleSidepanelMessage = (request) => {
  // Drop messages the background sent to itself via chrome.runtime.sendMessage
  if (request._source === "background") return true;

  if (request.type === "sidepanel-open") {
    openSidepanels[request.windowId] = true;
    return true;
  }
  if (request.type === "sidepanel-close") {
    delete openSidepanels[request.windowId];
    return true;
  }
  if (
    request.type === "addressReady" ||
    request.type === "overdueNoticeReady" ||
    request.type === "libraryInvoiceReady"
  ) {
    // Messages are handled by the sidepanel; returning true prevents background from processing them
    return true;
  }
  return false;
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
      _source: "background",
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

export { openSidepanels };
