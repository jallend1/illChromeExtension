const currentOptions = [
  { id: "copyWorldShareAddress", title: "Copy Address from WorldShare" },
  { id: "copyFromOCLC", title: "Copy Request Data from WorldShare" },
  { id: "pasteToEvergreen", title: "Paste Request Data into Evergreen" },
  { id: "overdueNotice", title: "Generate Overdue Notice" },
];

const isAllowedHost = (url) => {
  const manifest = chrome.runtime.getManifest();
  const allowedHosts = manifest.host_permissions || [];
  const urlObject = new URL(url);
  const host = urlObject.host;
  return allowedHosts.includes(host);
};

// Check if lendingMode in storage is true
chrome.storage.local.get("lendingMode", (result) => {
  if (result.lendingMode) {
    // Execute frequentLending script
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      if (!isAllowedHost(activeTab.url)) return;
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          files: ["./scripts/frequentLending.js"],
        },
        () => {
          chrome.tabs.sendMessage(
            activeTab.id,
            { data: "frequentLending" },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Error sending message:",
                  JSON.stringify(chrome.runtime.lastError, null, 2)
                );
              } else {
                console.log("Message sent successfully:", response);
              }
            }
          );
        }
      );
    });
  }
});

// Send a message to frequentLending script to update when page is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!isAllowedHost(tab.url)) return;
  if (changeInfo.status === "complete") {
    chrome.tabs.sendMessage(tabId, { data: "pageUpdated" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error sending message:",
          JSON.stringify(chrome.runtime.lastError, null, 2)
        );
      } else {
        console.log("Message sent successfully:", response);
      }
    });
  }
});

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
  if (!isAllowedHost(item.pageUrl)) return;
  chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: [`./scripts/${item.menuItemId}.js`],
    });
  });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
    if (!isAllowedHost(activeTab.url)) return;
    chrome.scripting.executeScript(
      {
        target: { tabId: activeTab.id },
        files: [`./scripts/${request.data}.js`],
      },
      () => {
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
  if (!isAllowedHost(tab.url)) return;
  // TODO: Feels like overkill and incredibly over complicated -- Simply this
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
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        files: ["./scripts/frequentLending.js"],
      },
      () => {
        chrome.tabs.sendMessage(
          tabId,
          { data: "frequentLending" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error sending message:",
                JSON.stringify(chrome.runtime.lastError, null, 2)
              );
            } else {
              console.log("Message sent successfully:", response);
            }
          }
        );
      }
    );
  } else if (changeInfo.status === "complete" && !tab.url.includes("/hold/")) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const frequentLibraries = document.querySelector("#frequentLibraries");
        if (frequentLibraries) {
          frequentLibraries.remove();
        }
      },
    });
  }

  if (changeInfo.status === "complete" && tab.url.includes("/circ/patron/")) {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        files: ["./scripts/courierHighlight.js"],
      },
      () => {
        // Send message to content script to display patron status
        chrome.tabs.sendMessage(
          tabId,
          { data: "courierHighlight" },
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

// If the tab is updated and the URL includes /cat/ill/track, add ILL page mods
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  let tabId = details.tabId;
  let currentUrl = details.url;
  if (currentUrl.includes("/cat/ill/track")) {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        files: ["./scripts/createILLPageMods.js"],
      },
      () => {
        // Send message to content script to display ILL page mods
        chrome.tabs.sendMessage(tabId, { data: "illPageMods" }, (response) => {
          chrome.runtime.lastError
            ? console.error("Error sending message:", chrome.runtime.lastError)
            : console.log("Message sent successfully:", response);
        });
      }
    );
  }
});
