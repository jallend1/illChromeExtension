import { isAllowedHost } from "../background-utils.js";
import { injectDymoFramework } from "./dymoFunctions.js";

/**
 * Handles patron page specific injections
 * @param {number} tabId
 * @param {string} url
 * @param {Function} executeScript
 */
const handlePatronPage = (tabId, url, executeScript) => {
  if (url.includes("/circ/patron/") && !url.includes("register")) {
    injectDymoFramework(tabId);
    chrome.scripting.insertCSS({
      target: { tabId },
      files: ["./styles/evergreen-patron.css"],
    });
    executeScript(tabId, "courierHighlight");
    executeScript(tabId, "injectPrintAddressButton");
  }
};

/**
 * Handles keyboard cowboy tooltip injection
 * @param {number} tabId
 * @param {string} url
 */
const handleKeyboardCowboy = (tabId, url) => {
  if (url.includes("/circ/patron/bcsearch")) {
    chrome.scripting.executeScript({
      target: { tabId },
      func: (message) => {
        import(chrome.runtime.getURL("modules/keyboardCowboy.js")).then(
          ({ keyboardCowboy }) => {
            keyboardCowboy(message);
          }
        );
      },
      args: [
        `Press <span style="font-weight:bold;">F1</span> from any Evergreen page to reach this screen without ever touching your mouse!`,
      ],
    });
  }
};

/**
 * Main tab update handler
 * @param {number} tabId
 * @param {object} changeInfo
 * @param {object} tab
 * @param {boolean} arePassiveToolsActive
 * @param {Function} executeScript
 * @param {Function} sendTabUrlUpdate
 */
// In modules/tabEventHandlers.js - update the handleTabUpdate function call
export const handleTabUpdate = (
  tabId,
  changeInfo,
  tab,
  arePassiveToolsActive,
  executeScript,
  sendTabUrlUpdate
) => {
  if (!isAllowedHost(tab.url)) return;
  if (arePassiveToolsActive === false) return;

  if (changeInfo.status === "complete") {
    // Handle sidepanel URL updates
    if (tab.active) {
      // Convert tab object to details format
      sendTabUrlUpdate({
        tabId: tab.id,
        url: tab.url,
        windowId: tab.windowId,
      });
    }

    // Handle patron-specific injections (not covered by urlActions)
    handlePatronPage(tabId, tab.url, executeScript);
    handleKeyboardCowboy(tabId, tab.url);
  }
};
