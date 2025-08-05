import { initializeSessionLog } from "./session-logger.js";
import { injectDymoFramework } from "./modules/dymoFunctions.js";
import { urlActions } from "./urlActions.js";
import { handleMessage } from "./backgroundMessageHandler.js";
import { handleTabUpdate } from "./modules/tabEventHandlers.js";
import {
  sendTabUrlUpdate,
  isAnySidepanelOpen,
  openSidepanels,
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
import { isAllowedHost } from "./background-utils.js";

// Initialize warning message in console pointing people to me
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
  handleKeyboardShortcut(command, currentOptions, injectDymoFramework);
});

chrome.runtime.onMessage.addListener(handleMessage);

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // If the window ID is not in openSidepanels, ignore the event
  if (!isAnySidepanelOpen() || !openSidepanels[activeInfo.windowId]) {
    return;
  }

  const tab = await chrome.tabs.get(activeInfo.tabId);
  sendTabUrlUpdate({
    tabId: tab.id,
    url: tab.url,
    windowId: tab.windowId,
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  handleTabUpdate(
    tabId,
    changeInfo,
    tab,
    arePassiveToolsActive,
    executeScript,
    // Convert tab object to details format
    (tab) =>
      sendTabUrlUpdate({
        tabId: tab.id,
        url: tab.url,
        windowId: tab.windowId,
      })
  );
});

// SPA navigation handling
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (arePassiveToolsActive === false) return;

  if (!isAllowedHost(details.url)) {
    return;
  }

  // Handle sidepanel updates
  sendTabUrlUpdate(details);

  // Handle URL actions
  urlActions.forEach(({ match, action }) => {
    if (match(details.url)) {
      action(details.tabId);
    }
  });
});
