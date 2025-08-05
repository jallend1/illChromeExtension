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
 * @param {object} tab
 */
export const sendTabUrlUpdate = (tab) => {
  if (!isAnySidepanelOpen() || !openSidepanels[tab.windowId]) {
    return;
  }

  chrome.runtime.sendMessage(
    {
      type: "tab-url-updated",
      tabId: tab.id,
      url: tab.url,
      windowId: tab.windowId,
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

/**
 * Handles tab activation events for sidepanel
 * @param {object} activeInfo
 */
export const handleTabActivation = async (activeInfo) => {
  if (!isAnySidepanelOpen() || !openSidepanels[activeInfo.windowId]) {
    return;
  }

  const tab = await chrome.tabs.get(activeInfo.tabId);
  console.log("Sending tab URL update:", {
    tabId: tab.id,
    url: tab.url,
    windowId: tab.windowId,
  });

  sendTabUrlUpdate(tab);
};

/**
 * Handles SPA navigation for sidepanel
 * @param {object} details
 */
export const handleSPANavigation = (details) => {
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
