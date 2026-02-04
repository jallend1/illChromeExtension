import { getActiveTab, createTab, getNonActiveEvergreenTab, updateTab } from "../background-utils.js";

/**
 * Enhanced script executor with better error handling
 * @param {number} tabId
 * @param {string} script
 */
export const executeScript = (tabId, script) => {
  const scriptsWithoutMessages = [
    "frequentLending",
    "injectPrintAddressButton",
    "retrievePatron",
    "sendPatronToWorldShare",
    "worldShareMods",
    "searchResults",
    "createILLPageMods",
    "updateAddress",
    "adjustLongDueDate",
    "requestManagerMods",
    "dismissOpenTransit",
    "holdScreenMods",
  ];

  chrome.scripting.executeScript(
    {
      target: { tabId },
      files: [`./scripts/${script}.js`],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          `Error executing script ${script}:`,
          chrome.runtime.lastError
        );
        return;
      }

      // No message handling needed for certain scripts
      if (scriptsWithoutMessages.includes(script)) {
        return;
      }

      chrome.tabs.sendMessage(tabId, { data: script }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            `Error sending message for script ${script}:`,
            JSON.stringify(chrome.runtime.lastError, null, 2)
          );
        }
      });
    }
  );
};

/**
 * Creates a tab and executes a script when it loads
 * @param {string} url - The URL to open
 * @param {string} scriptName - Name of the script (without .js extension)
 */
export const createTabWithScript = (url, scriptName) => {
  createTab(url);

  const onTabUpdated = (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url === url && tab.active) {
      executeScript(tabId, scriptName); // Use existing function
      chrome.tabs.onUpdated.removeListener(onTabUpdated);
    }
  };
  chrome.tabs.onUpdated.addListener(onTabUpdated);
};

/**
 * Navigates an existing non-active Evergreen tab to the URL, or creates a new tab if none exists.
 * Executes the specified script when the tab loads.
 * @param {string} url - The URL to open
 * @param {string} scriptName - Name of the script (without .js extension)
 */
export const reuseTabOrCreateWithScript = async (url, scriptName) => {
  const existingTab = await getNonActiveEvergreenTab();

  if (existingTab) {
    // Navigate the existing non-active Evergreen tab
    const onTabUpdated = (tabId, changeInfo, tab) => {
      if (tabId === existingTab.id && changeInfo.status === "complete") {
        executeScript(tabId, scriptName);
        chrome.tabs.onUpdated.removeListener(onTabUpdated);
      }
    };
    chrome.tabs.onUpdated.addListener(onTabUpdated);
    updateTab(existingTab.id, url);
  } else {
    // No existing non-active Evergreen tab, create a new one
    createTabWithScript(url, scriptName);
  }
};

/**
 * Enhanced keyboard shortcut handler
 * @param {string} command
 * @param {Array} currentOptions
 * @param {Function} injectDymoFramework
 */
export const handleKeyboardShortcut = async (
  command,
  currentOptions,
  injectDymoFramework
) => {
  const option = currentOptions.find((opt) => opt.id === command);
  if (!option) {
    console.warn(`No option found for command: ${command}`);
    return;
  }

  const activeTab = await getActiveTab();
  if (!activeTab) {
    console.error("No active tab available for keyboard shortcut");
    return;
  }

  if (option.id === "copyWorldShareAddress") {
    console.log("Injecting Dymo framework for copying address from WorldShare");
    injectDymoFramework(activeTab.id);
  }

  chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    files: [`./scripts/${option.id}.js`],
  });
};
