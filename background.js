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

// chrome.runtime.onMessage.addListener(handleMessage);

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   // Call handleMessage and check if it returns a promise or true
//   const result = handleMessage(request, sender, sendResponse);
//   if (result instanceof Promise) {
//     result.catch((error) => {
//       console.error("Error in message handler:", error);
//     });
//     return true; // Keep message port open for async operations
//   }
//   return result;
// });

// More complex version to sus out where the uncaught promise errors are coming from
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request.action, "from tab:", sender.tab?.id);
  
  const result = handleMessage(request, sender, sendResponse);
  
  if (result instanceof Promise) {
    result
      .then((response) => {
        console.log("Promise resolved for:", request.action);
        sendResponse(response);
      })
      .catch((error) => {
        console.error("Error in message handler for:", request.action, error);
        sendResponse({ error: error.message });
      });
    return true;
  }
  
  console.log("Synchronous response for:", request.action);
  return result;
});

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
    console.log("URL from background.js: ", details.url);
    if (details.url.includes("kinokuniya.com")) {
      console.log("Matched kinokuniya.com");
      console.log(match, action);
    }
    if (match(details.url)) {
      action(details.tabId);
    }
  });
});
