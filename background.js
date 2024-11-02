const currentOptions = [
  { id: "copyWorldShareAddress", title: "Copy Address from WorldShare" },
  { id: "copyFromOCLC", title: "Copy Request Data from WorldShare" },
  { id: "pasteToEvergreen", title: "Paste Request Data into Evergreen" },
  { id: "overdueNotice", title: "Generate Overdue Notice" },
];

let arePassiveToolsActive;

chrome.storage.local.get("arePassiveToolsActive", (result) => {
  arePassiveToolsActive = result.arePassiveToolsActive;
});

const isAllowedHost = (url) => {
  const manifest = chrome.runtime.getManifest();
  const allowedHosts = manifest.host_permissions || [];
  return allowedHosts.some((pattern) => {
    const urlPattern = new URLPattern(pattern);
    return urlPattern.test(url);
  });
};

const sessionLog = () => {
  const logToConsole = () => {
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
  chrome.storage.session.get(["logged"], (result) => {
    if (!result.logged) {
      chrome.tabs.query(
        { active: true, currentWindow: true },
        ([activeTab]) => {
          if (activeTab) {
            chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              func: logToConsole,
            });
          }
        }
      );
      chrome.storage.session.set({ logged: true });
    }
  });
};

const executeScript = (tabId, script) => {
  // Logs message to the console on first run so people know where to direct their rage
  sessionLog();

  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      files: [`./scripts/${script}.js`],
    },
    () => {
      // No message handling needed for frequentLending script
      if (script === "frequentLending") return;
      chrome.tabs.sendMessage(tabId, { data: script }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error sending message: " + script,
            JSON.stringify(chrome.runtime.lastError, null, 2)
          );
        } else {
          console.log("Message sent successfully:", response);
        }
      });
    }
  );
};

// Check if lendingMode in storage is true
chrome.storage.local.get("lendingMode", (result) => {
  if (result.lendingMode) {
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      if (!isAllowedHost(activeTab.url)) return;
      executeScript(activeTab.id, "frequentLending");
    });
  }
});

// Fire frequentLending script to update when page is updated to ensure persistence of lending bar
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  const { tabId, url } = details;
  if (!isAllowedHost(url)) return;
  executeScript(tabId, "frequentLending");
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
    if (request.command === "toggleExtension") {
      chrome.storage.local.get("arePassiveToolsActive", (result) => {
        arePassiveToolsActive = result.arePassiveToolsActive;
        console.log("Extension status:", arePassiveToolsActive);
      });
      return;
    }
    // For isbnSearch, checks if Evergreen tab already open and updates URL -- Otherwise opens new tab
    if (request.action === "isbnSearch") {
      chrome.tabs.query({}, function (tabs) {
        const urlSuffix = request.url;
        let mobile = false;
        let mobilePrefix =
          "https://evgmobile.kcls.org/eg2/en-US/staff/catalog/";
        let clientPrefix =
          "https://evgclient.kcls.org/eg2/en-US/staff/catalog/";
        let evgClientTab = null;
        for (let tab of tabs) {
          if (tab.url.includes("evgmobile")) {
            mobile = true;
            evgClientTab = tab;
          } else if (tab.url.includes("evgclient")) {
            evgClientTab = tab;
          }
        }
        const url = mobile
          ? mobilePrefix + urlSuffix
          : clientPrefix + urlSuffix;
        if (evgClientTab) {
          chrome.tabs.update(evgClientTab.id, { url: url, active: true });
        } else {
          chrome.tabs.create({ url: url, active: true });
        }
      });
      return;
    }

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
  if (arePassiveToolsActive === false) return;
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
  }
  if (changeInfo.status === "complete" && tab.url.includes("/circ/patron/")) {
    executeScript(tabId, "courierHighlight");
  }
});

// SPA navigation handling
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (arePassiveToolsActive === false) return;
  let tabId = details.tabId;
  let currentUrl = details.url;
  if (!isAllowedHost(currentUrl)) {
    return;
  }
  // TODO: This is a work in progress -- Mostly just playing right now
  chrome.scripting.insertCSS({
    target: { tabId: tabId },
    files: ["./styles/darkmode.css"],
  });
  // Injects 'Box' and 'Bag' checkboxes on the Create ILL form
  if (currentUrl.includes("/cat/ill/track")) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["./scripts/createILLPageMods.js"],
    });
  } else if (currentUrl.includes("catalog/hold/")) {
    // Inject a CSS file to style the warning when placing a hold is unsuccessful
    chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ["./styles/warning.css"],
    });
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["./scripts/holdScreenMods.js"],
    });
  } else if (currentUrl.includes("/catalog/search?")) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["./scripts/searchResults.js"],
    });
  }
});
