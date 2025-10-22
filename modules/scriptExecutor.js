import { getActiveTab, createTab } from "../background-utils.js";

/**
 * Enhanced script executor with better error handling
 * @param {number} tabId
 * @param {string} script
 */
export const executeScript = (tabId, script) => {
  console.log(script);
  const scriptsWithoutMessages = [
    "frequentLending",
    "injectPrintAddressButton",
    "retrievePatron",
    "sendPatronToWorldShare",
    "worldShareMods",
    "searchResults",
    "createILLPageMods",
    "updateAddress",
    "adjustBellinghamDate",
    "requestManagerMods",
    "dismissOpenTransit",
    "holdScreenMods",
    "patronSearchScreenMods",
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
