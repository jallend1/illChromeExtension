/**
 * Session logger so people know who to blame if something is weird on WorldShare or Evergreen
 */

// Track which URLs we've already logged for this session
let loggedUrls = new Set();

// URLs where we want the warning message to trigger
const TRIGGER_URLS = ["share.worldcat.org", "kcls.org/eg2"];

/**
 * Checks if URL should trigger the welcome message
 * @param {string} url - The URL to check
 * @returns {string|null} - The matching pattern if it should trigger, null otherwise
 */
const shouldTriggerLog = (url) => {
  if (!url) return null;

  for (const pattern of TRIGGER_URLS) {
    if (url.includes(pattern) && !loggedUrls.has(pattern)) {
      return pattern;
    }
  }
  return null;
};

/**
 * The injects the logging function into the page
 * @returns {void} - Injects a function that logs a warning message to the page console
 */
const logToPageConsole = () => {
  console.log(`
  ⊂_ヽ    
  　 ＼＼
  　　 ＼( ͡ ° ͜ʖ ͡° )    Jason Allen
  　　　 >　⌒ヽ       
  　　　/ 　 へ＼       (Probably)
  　　 /　　/　＼＼
  　　 ﾚ　ノ   　 ヽ_つ  Didn't break
  　　/　/
  　 /　/|      anything here.
  　(　( \\
  　|　 |、＼     But if he did?
    | 丿 ＼ ⌒)
  　| |   ) /    jallend1@gmail.com
   ノ )   Lﾉ
  (_／
   `);
};

/**
 * Logs welcome message to the page's console
 * @param {number} tabId - The ID of the tab to log the message in
 * @param {string} pattern - The URL pattern that triggered the log
 * @returns {void} - Injects the logToPageConsole function into the page and executes it
 */
const logWelcomeMessage = (tabId, pattern) => {
  chrome.scripting
    .executeScript({
      target: { tabId: tabId },
      func: logToPageConsole,
    })
    .then(() => {
      // Mark this pattern as logged so we don't log it again
      loggedUrls.add(pattern);
    })
    .catch((error) => {
      console.error("Failed to inject welcome message:", error);
    });
};

/**
 * Initializes session logging based on URL access
 * @returns {void} - Sets up listeners for tab updates, SPA navigation, and new tab creation
 */
export const initializeSessionLog = () => {
  // Listen for tab updates
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
      const pattern = shouldTriggerLog(tab.url);
      if (pattern) {
        console.log("Initializing session log for:", tab.url);
        console.log(loggedUrls);
        logWelcomeMessage(tabId, pattern);
      }
    }
  });

  // Listen for SPA navigation
  chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    const pattern = shouldTriggerLog(details.url);
    if (pattern) {
      console.log("SPA navigation detected for:", details.url);
      console.log(loggedUrls);
      logWelcomeMessage(details.tabId, pattern);
    }
  });

  // Listen for new tab creation with target URLs
  chrome.tabs.onCreated.addListener((tab) => {
    const pattern = shouldTriggerLog(tab.url);
    if (pattern) {
      console.log("New tab created for:", tab.url);
      console.log(loggedUrls);
      logWelcomeMessage(tab.id, pattern);
    }
  });
};
