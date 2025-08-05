import { initializeSessionLog } from "./session-logger.js";
import { injectDymoFramework } from "./modules/dymoFunctions.js";
import { urlActions } from "./urlActions.js";
import { handleMessage } from "./backgroundMessageHandler.js";
import { handleTabUpdate } from "./modules/tabEventHandlers.js";
import {
  handleTabActivation,
  handleSPANavigation,
  sendTabUrlUpdate,
} from "./modules/sidepanelCommunication.js";
import {
  initializeLendingMode,
  handleStorageChanges,
  getPassiveToolsState,
} from "./modules/storageManager.js";
import {
  executeScript,
  handleKeyboardShortcut,
} from "./modules/scriptExecutor.js";
import { isAllowedHost, getActiveTab } from "./background-utils.js";

console.log("injectDymoFramework imported:", typeof injectDymoFramework);

// Initialize session logging
initializeSessionLog();

const currentOptions = [
  { id: "copyWorldShareAddress", title: "Copy Address from WorldShare" },
  { id: "copyFromOCLC", title: "Copy Request Data from WorldShare" },
  { id: "overdueNotice", title: "Generate Overdue Notice" },
];

let arePassiveToolsActive;

// Initialize passive tools state
getPassiveToolsState().then((state) => {
  arePassiveToolsActive = state;
});

// Initialize lending mode
initializeLendingMode(executeScript);

// Event Listeners
chrome.storage.onChanged.addListener(handleStorageChanges);

chrome.commands.onCommand.addListener((command) => {
  handleKeyboardShortcut(
    command,
    currentOptions,
    getActiveTab,
    injectDymoFramework
  );
});

chrome.runtime.onMessage.addListener(handleMessage);

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.tabs.onActivated.addListener(handleTabActivation);

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  handleTabUpdate(
    tabId,
    changeInfo,
    tab,
    arePassiveToolsActive,
    executeScript,
    sendTabUrlUpdate
  );
});

// SPA navigation handling
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (arePassiveToolsActive === false) return;

  if (!isAllowedHost(details.url)) {
    return;
  }

  // Handle sidepanel updates
  handleSPANavigation(details);

  // Handle URL actions
  urlActions.forEach(({ match, action }) => {
    if (match(details.url)) {
      action(details.tabId);
    }
  });

  // Remove tooltip if not on hold page
  if (!details.url.includes("catalog/hold/")) {
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      func: () => {
        const tooltip = document.querySelector("#keyboard-cowboy-tooltip");
        if (tooltip) tooltip.remove();
      },
    });
  }
});
