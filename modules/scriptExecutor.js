/**
 * Enhanced script executor with better error handling
 * @param {number} tabId
 * @param {string} script
 */
export const executeScript = (tabId, script) => {
  const scriptsWithoutMessages = [
    "frequentLending",
    "injectPrintAddressButton",
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
 * Enhanced keyboard shortcut handler
 * @param {string} command
 * @param {Array} currentOptions
 * @param {Function} getActiveTab
 * @param {Function} injectDymoFramework
 */
export const handleKeyboardShortcut = async (
  command,
  currentOptions,
  getActiveTab,
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
