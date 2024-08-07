// *5. Generate an invoice for external partners (Evergreen - Contextual with patron type or name?)
// *6. Automatically switch tabs from request screen to Evergreen tab and auto-fill?
// * 10 Move state abbreviation conversion into its own file because it's now being used by multiple sources

const currentOptions = [
  { id: "copyWorldShareAddress", title: "Copy Address from WorldShare" },
  { id: "copyFromOCLC", title: "Copy Request Data from WorldShare" },
  { id: "pasteToEvergreen", title: "Paste Request Data into Evergreen" },
  { id: "overdueNotice", title: "Generate Overdue Notice" },
];

// TODO No longer working by default in latest version of Chrome -- Requires manual setup once installed?
// Add keyboard shortcuts for each option
chrome.commands.onCommand.addListener((command) => {
  currentOptions.forEach((option) => {
    if (command === option.id) {
      chrome.tabs.query(
        { active: true, currentWindow: true },
        ([activeTab]) => {
          chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: [`./scripts/${option.id}.js`],
          });
        }
      );
    }
  });
});

// Add context menu items for each option
chrome.runtime.onInstalled.addListener(() => {
  currentOptions.forEach((option) => {
    chrome.contextMenus.create({
      id: option.id,
      title: option.title,
      contexts: ["all"],
    });
  });
});

// Add event listener for context menu clicks
chrome.contextMenus.onClicked.addListener((item) => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: [`./scripts/${item.menuItemId}.js`],
    });
  });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: activeTab.id },
        files: [`./scripts/${request.data}.js`],
      },
      () => {
        // Sends response once script is fully executed
        sendResponse({ response: "Message received" });
      }
    );
  });
  return true;
});

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// If the tab is updated and the URL includes /hold/, check for lending fee
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url.includes("/hold/")) {
    chrome.storage.local.get("lendingFee", (result) => {
      if (result.lendingFee && result.lendingFee === "0.00") {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabId },
            files: ["./scripts/lendingFeeAlert.js"],
          },
          () => {
            // Send message to content script to display lending fee alert
            chrome.tabs.sendMessage(
              tabId,
              { data: "lendingFeeAlert", lendingFee: result.lendingFee },
              (response) => {
                chrome.runtime.lastError
                  ? console.error(
                      "Error sending message:",
                      chrome.runtime.lastError
                    )
                  : console.log("Message sent successfully:", response);
              }
            );
          }
        );
      }
    });
  }
});
