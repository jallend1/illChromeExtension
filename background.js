const currentOptions = [
  { id: "copyWorldShareAddress", title: "Copy Address from WorldShare" },
  { id: "copyFromOCLC", title: "Copy Request Data from WorldShare" },
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
  // TODO: Is this bad boy firing on WorldSshare pages? -- If so, I need to add a check
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

const calculateURL = (mobileURL, clientURL) => {
  chrome.tabs.query({}, function (tabs) {
    let mobile = false;
    let evgClientTab = null;
    for (let tab of tabs) {
      if (tab.url.includes("evgmobile")) {
        mobile = true;
        evgClientTab = tab;
        break;
      } else if (tab.url.includes("evgclient")) {
        evgClientTab = tab;
        break;
      }
    }
    let url = mobile ? mobileURL : clientURL;
    if (evgClientTab) {
      chrome.tabs.update(evgClientTab.id, { url: url, active: true });
    } else {
      chrome.tabs.create({ url: url, active: true });
    }
  });
};

// TODO: Using command and actions here is a bit confusing -- Maybe combine? Or at least have a justification for it
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
    if (!isAllowedHost(activeTab.url)) return;
    if (request.command === "toggleExtension") {
      chrome.storage.local.get("arePassiveToolsActive", (result) => {
        arePassiveToolsActive = result.arePassiveToolsActive;
      });
      return;
    }
    if (request.command === "disableButton") {
      chrome.management.getSelf((extensionInfo) => {
        chrome.tabs.reload(activeTab.id);
        chrome.management.setEnabled(extensionInfo.id, false, () => {
          console.log("Extension disabled.");
        });
      });
      return;
    }
    if (request.command === "openCreateILL") {
      let mobileURL =
        "https://evgmobile.kcls.org/eg2/en-US/staff/cat/ill/track";
      let clientURL =
        "https://evgclient.kcls.org/eg2/en-US/staff/cat/ill/track";
      calculateURL(mobileURL, clientURL);
      return;
    }
    // For isbnSearch, checks if Evergreen tab already open and updates URL -- Otherwise opens new tab
    if (request.action === "isbnSearch") {
      const urlSuffix = request.url;
      let mobilePrefix =
        "https://evgmobile.kcls.org/eg2/en-US/staff/catalog/" + urlSuffix;
      let clientPrefix =
        "https://evgclient.kcls.org/eg2/en-US/staff/catalog/" + urlSuffix;
      calculateURL(mobilePrefix, clientPrefix);
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

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!isAllowedHost(tab.url)) return;
  if (arePassiveToolsActive === false) return;
  if (tab.url.includes("/staff/")) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["./scripts/darkMode.js"],
    });
  }

  // TODO: Add a modal informing user that transit was clicked
  // Dismisses 'Open Transit on item' modal when checking out items
  if (tab.url.includes("/checkout")) {
    console.log("Checkout page loaded");
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["./scripts/dismissOpenTransit.js"],
    });
  }

  // TODO: Feels like overkill and incredibly over complicated -- Simplify this
  // If the tab is updated and the URL includes /hold/, check for lending fee
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
  // TODO: This if/else situation is absurd and nobody should ever lay eyes on it but me
  if (arePassiveToolsActive === false) return;
  let tabId = details.tabId;
  let currentUrl = details.url;
  if (!isAllowedHost(currentUrl)) {
    return;
  }
  // TODO: This is a work in progress -- Mostly just playing right now
  if (currentUrl.includes("/staff/")) {
    chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ["./styles/darkmode.css"],
    });
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["./scripts/darkMode.js"],
    });
  }
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
  if (!currentUrl.includes("catalog/hold/")) {
    // Remove the tooltip if the user navigates away from the hold page
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const tooltip = document.querySelector("#keyboard-cowboy-tooltip");
        if (tooltip) tooltip.remove();
      },
    });
  }
  // TODO: Work in progress to implement recommendations for return dates
  if (currentUrl.includes("share.worldcat.org")) {
    // TODO: Add some kind of flag to check if the script has already been run? Regex seems like a good potential solution?
    // const regex = /\/requests\/(\d+)/;
    // const match = currentUrl.match(regex);
    // console.log(match[1]);
    // chrome.scripting.executeScript({
    //   target: { tabId: tabId },
    //   files: ["./scripts/requestDueDate.js"],
    // });
  }
});
