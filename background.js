import {
  getBaseURL,
  focusOrCreateTab,
  isEvgMobile,
  isAllowedHost,
  URLS,
} from "./background-utils.js";

// import Papa from "./libs/papaparse.min.js";
// import Papa from "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js";

let openSidepanels = {};

const currentOptions = [
  { id: "copyWorldShareAddress", title: "Copy Address from WorldShare" },
  { id: "copyFromOCLC", title: "Copy Request Data from WorldShare" },
  { id: "overdueNotice", title: "Generate Overdue Notice" },
];

let arePassiveToolsActive;
chrome.storage.local.get("arePassiveToolsActive", (result) => {
  arePassiveToolsActive = result.arePassiveToolsActive;
});

const getActiveTab = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length > 0) {
    return tabs[0];
  } else {
    console.error("No active tab found.");
    return null;
  }
};

// TODO: Maybe just run this onInstall event?
const sessionLog = async () => {
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
  chrome.storage.session.get(["logged"], async (result) => {
    if (!result.logged) {
      const activeTab = await getActiveTab();
      if (activeTab) {
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: logToConsole,
        });
      }
      chrome.storage.session.set({ logged: true });
    }
  });
};

function isAnySidepanelOpen() {
  return Object.keys(openSidepanels).length > 0;
}

const calculateURL = async (urlSuffix) => {
  const baseUrl = await getBaseURL(urlSuffix);
  await focusOrCreateTab(baseUrl);
};

const executeScript = (tabId, script) => {
  // Logs message to the console on first run so people know where to direct their rage
  sessionLog();
  console.log(`Executing script: ${script} on tabId: ${tabId}`);

  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      files: [`./scripts/${script}.js`],
    },
    () => {
      // No message handling needed for frequentLending or injectPrintAddressButton scripts
      if (script === "frequentLending" || script === "injectPrintAddressButton")
        return;

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
chrome.storage.local.get("lendingMode", async (result) => {
  if (result.lendingMode) {
    const activeTab = await getActiveTab();
    if (activeTab) {
      if (!isAllowedHost(activeTab.url)) return;
      executeScript(activeTab.id, "frequentLending");
    }
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    chrome.runtime.sendMessage({
      type: "storage-updated",
      changes: changes,
    });
    // If changes include lendingMode, update it on all open tabs
    if (changes.lendingMode) {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (isAllowedHost(tab.url)) {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ["./scripts/frequentLending.js"],
            });
          }
        });
      });
    }
  }
});

// Add keyboard shortcuts for each option
chrome.commands.onCommand.addListener((command) => {
  const option = currentOptions.find((opt) => opt.id === command);
  if (!option) {
    console.warn(`No option found for command: ${command}`);
    // Unknown command, do nothing
    return;
  }
  (async () => {
    const activeTab = await getActiveTab();
    if (activeTab) {
      if (option.id === "copyWorldShareAddress") {
        injectDymoFramework(activeTab.id);
      }
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: [`./scripts/${option.id}.js`],
      });
    }
  })();
});

const retrievePatron = async () => {
  const baseUrl = (await isEvgMobile()) ? URLS.MOBILE_BASE : URLS.CLIENT_BASE;
  const url = `${baseUrl}${URLS.PATRON_SEARCH}`;

  chrome.tabs.create(
    {
      url: url,
      active: true,
    },
    (newTab) => {
      if (!newTab) {
        console.error("Failed to create a new tab.");
        return;
      }
      const onTabUpdated = (tabId, changeInfo, tab) => {
        if (tabId === newTab.id && changeInfo.status === "complete") {
          chrome.scripting.executeScript(
            {
              target: { tabId: newTab.id },
              files: ["./scripts/retrievePatron.js"],
            },
            async () => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Error executing script:",
                  chrome.runtime.lastError.message
                );
              }
              // Get the latest tab info to ensure correct URL and windowId
              const updatedTab = await chrome.tabs.get(newTab.id);
              chrome.runtime.sendMessage({
                type: "tab-url-updated",
                tabId: updatedTab.id,
                url: updatedTab.url,
                windowId: updatedTab.windowId,
              });
            }
          );
          chrome.tabs.onUpdated.removeListener(onTabUpdated);
        }
      };
      chrome.tabs.onUpdated.addListener(onTabUpdated);
    }
  );
};

// TODO: Using command and actions here is a bit confusing -- Maybe combine? Or at least have a justification for it
chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.type === "sidepanel-open") {
    openSidepanels[request.windowId] = true;
    return;
  }
  if (request.type === "sidepanel-close") {
    delete openSidepanels[request.windowId];
    return;
  }
  if (request.type === "findAndSwitchToWorldShare") {
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("Error querying tabs:", chrome.runtime.lastError);
        return;
      }
      const worldShareTab = tabs.find(
        (tab) => tab.url && tab.url.includes("share.worldcat.org")
      );
      if (worldShareTab && worldShareTab.id) {
        // Switches to WorldShare tab
        chrome.tabs.update(worldShareTab.id, { active: true }, (tab) => {
          if (chrome.runtime.lastError) {
            console.error("Error activating tab:", chrome.runtime.lastError);
            return;
          }
          // Waits a hot second before executing script
          setTimeout(() => {
            chrome.scripting.executeScript(
              {
                target: { tabId: worldShareTab.id },
                files: [`./scripts/${request.scriptToRelaunch}.js`],
              },
              () => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Error executing script:",
                    chrome.runtime.lastError
                  );
                }
              }
            );
          }, 100);
        });
      } else {
        console.log("No WorldShare tab found in", tabs.length, "tabs");
      }
    });
    return;
  }
  const activeTab = await getActiveTab();
  if (activeTab) {
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
    if (request.action === "editPatron") {
      // Store patron barcode in local storage
      chrome.storage.local.set({ patronBarcode: request.patronBarcode }, () => {
        console.log("Patron barcode stored");
      });
      // Open the patron page in a new tab
      retrievePatron();
      sendResponse({ success: true });
      return;
    }
    if (request.command === "openCreateILL") {
      // Coming from copyFromOCLC
      calculateURL(URLS.CREATE_ILL);
      return;
    }
    if (request.action === "isbnSearch") {
      await calculateURL(URLS.CATALOG + "/" + request.url);
      return true; // <-- Keeps the message port open for async response
    }

    if (request.data === "copyWorldShareAddress") {
      injectDymoFramework(activeTab.id);
      sendResponse({ success: true });
    }

    if (request.action === "retrievePatron") {
      chrome.storage.local.set({ request }, () => {
        console.log("Request Data stored", request);
      });
      retrievePatron();
      return;
    }

    if (request.data) {
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          files: [`./scripts/${request.data}.js`],
        },
        () => {
          sendResponse({ response: "Message received" });
        }
      );
    }
  }
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

// When a different tab is activated, send the new tab's URL to the side panel so it can update buttons
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // If the window ID is not in openSidepanels, ignore the event
  if (!isAnySidepanelOpen() || !openSidepanels[activeInfo.windowId]) {
    return;
  }
  const tab = await chrome.tabs.get(activeInfo.tabId);
  chrome.runtime.sendMessage(
    {
      type: "tab-url-updated",
      tabId: tab.id,
      url: tab.url,
      windowId: tab.windowId,
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error sending tab URL update:",
          chrome.runtime.lastError
        );
      }
    }
  );
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!isAllowedHost(tab.url)) return;
  if (arePassiveToolsActive === false) return;
  // Updates button status in the side panel when the tab URL changes
  if (changeInfo.status === "complete" && tab.active) {
    // If the window ID is not in openSidepanels, ignore the event
    if (!isAnySidepanelOpen() && openSidepanels[tab.windowId]) {
      chrome.runtime.sendMessage(
        {
          type: "tab-url-updated",
          url: tab.url,
          windowId: tab.windowId,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error sending tab URL update:",
              chrome.runtime.lastError
            );
          }
        }
      );
    }
  }
  if (
    changeInfo.status === "complete" &&
    tab.url.includes("share.worldcat.org")
  ) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["./scripts/worldShareMods.js"],
    });
  }
  if (
    tab.url.includes("staff/cat/requests") &&
    changeInfo.status === "complete"
  ) {
    // Inject the request manager mods script when the request manager page is loaded
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["./scripts/requestManagerMods.js"],
    });
  }

  // Dismisses 'Open Transit on item' modal when checking out items
  if (tab.url.includes("/checkout") && changeInfo.status === "complete") {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["./scripts/dismissOpenTransit.js"],
    });
  }

  if (
    changeInfo.status === "complete" &&
    tab.url.includes("/circ/patron/") &&
    !tab.url.includes("register")
  ) {
    injectDymoFramework(tabId);
    chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ["./styles/evergreen-patron.css"],
    });
    executeScript(tabId, "courierHighlight");
    executeScript(tabId, "injectPrintAddressButton");
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
  // If side panel is open, send the updated URL to the side panel
  if (isAnySidepanelOpen() && openSidepanels[details.windowId]) {
    chrome.runtime.sendMessage(
      {
        type: "tab-url-updated",
        tabId: details.tabId,
        url: details.url,
        windowId: details.windowId,
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error sending tab URL update:",
            chrome.runtime.lastError
          );
        }
      }
    );
  }

  // Fire frequentLending script to update when page is updated to ensure persistence of lending bar
  if (currentUrl.includes("/eg2/en-US/staff/")) {
    executeScript(tabId, "frequentLending");
  }

  // -- Create ILL Page --
  if (currentUrl.includes("/cat/ill/track")) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["./scripts/createILLPageMods.js"],
    });
    chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ["./styles/createILLPage.css"],
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
  } else if (currentUrl.includes("/circ/patron/register")) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["./scripts/updateAddress.js"],
    });
  } else if (currentUrl.includes("/circ/patron/2372046/checkout")) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["./scripts/adjustBellinghamDate.js"],
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
  if (currentUrl.includes("share.worldcat.org")) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["./scripts/worldShareMods.js"],
    });
  }
  if (currentUrl.includes("/staff/cat/requests")) {
    // Inject the request manager mods script when the request manager page is loaded
    console.log("Sending again");
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["./scripts/requestManagerMods.js"],
    });
  }
});
