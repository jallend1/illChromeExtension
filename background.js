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

// TODO: Maybe just run this onInstall event?
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

// TODO: This...doesn't seem to be being used??? printDymo doesn't exist in this function; getAddressFrom Storage isn't called anywhere I can see
// const getAddressFromStorage = () => {
//   chrome.storage.local.get("addressString", (result) => {
//     if (chrome.runtime.lastError) {
//       console.error("Error retrieving address from storage:", error);
//       return;
//     }
//     const addressString = result.addressString;
//     if (addressString) {
//       console.log("here i am");
//       printDymo(addressString);
//     } else {
//       console.error("No address string found in storage.");
//     }
//   });
// };

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
        }
      });
    }
  );
};

// If lendingMode is true, turn on the frequent lenders bar
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
  if (url.includes("/eg2/en-US/staff/")) {
    executeScript(tabId, "frequentLending");
  }
});

// Add keyboard shortcuts for each option
chrome.commands.onCommand.addListener((command) => {
  currentOptions.forEach((option) => {
    if (command === option.id) {
      chrome.tabs.query(
        { active: true, currentWindow: true },
        ([activeTab]) => {
          if (option.id === "copyWorldShareAddress") {
            injectDymoFramework(activeTab.id);
          }
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
      // Update the existing tab and bring it to the foreground
      chrome.tabs.update(evgClientTab.id, { url: url, active: true }, () => {
        chrome.windows.update(evgClientTab.windowId, { focused: true });
      });
    } else {
      // Create a new tab and bring it to the foreground
      chrome.tabs.create({ url: url, active: true }, (newTab) => {
        chrome.windows.update(newTab.windowId, { focused: true });
      });
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

    if (request.data === "copyWorldShareAddress") {
      injectDymoFramework(activeTab.id);
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

const injectDymoFramework = (tabId) => {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      func: () => {
        return typeof dymo !== "undefined" && dymo.label;
      },
    },
    (result) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error injecting Dymo framework:",
          chrome.runtime.lastError
        );
        return;
      }
      const isDymoLoaded = result[0]?.result;
      if (!isDymoLoaded) {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ["./libs/dymo.connect.framework.js"],
        });
      }
    }
  );
};

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
  if (tab.url.includes("/checkout") && changeInfo.status === "complete") {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["./scripts/dismissOpenTransit.js"],
    });
  }

  // TODO: Feels like overkill and incredibly over complicated -- Simplify this
  // If the tab is updated and the URL includes /hold/, check for lending fee
  if (changeInfo.status === "complete" && tab.url.includes("/hold/")) {
    console.log("Checking lending fee...");
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
                if (chrome.runtime.lastError) {
                  console.error(
                    "Error sending message:",
                    chrome.runtime.lastError
                  );
                }
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
  if (
    changeInfo.status === "complete" &&
    tab.url.includes("/circ/patron/bcsearch")
  ) {
    // Run keyboardCowboy module to add tooltip to the page
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (message) => {
        import(chrome.runtime.getURL("modules/keyboardCowboy.js")).then(
          ({ keyboardCowboy }) => {
            keyboardCowboy(message);
          }
        );
      },
      args: [
        `Press <span style="font-weight:bold;">F1</span> from any Evergreen page to reach this screen without ever touching your mouse!`,
      ],
    });
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
