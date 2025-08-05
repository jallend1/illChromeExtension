import {
  getBaseURL,
  focusOrCreateTab,
  isEvgMobile,
  isAllowedHost,
  URLS,
} from "./background-utils.js";

import { initializeSessionLog } from "./session-logger.js";
import { injectDymoFramework } from "./modules/dymoFunctions.js";
import { urlActions } from "./urlActions.js";
import { handleMessage, openSidepanels } from "./backgroundMessageHandler.js";

console.log("injectDymoFramework imported:", typeof injectDymoFramework);

// Initialize session logging
initializeSessionLog();

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

function isAnySidepanelOpen() {
  return Object.keys(openSidepanels).length > 0;
}

const executeScript = (tabId, script) => {
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
    return;
  }
  (async () => {
    const activeTab = await getActiveTab();
    if (activeTab) {
      if (option.id === "copyWorldShareAddress") {
        console.log(
          "Injecting Dymo framework for copying address from WorldShare"
        );
        injectDymoFramework(activeTab.id);
      }
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: [`./scripts/${option.id}.js`],
      });
    }
  })();
});

// Use the extracted message handler
chrome.runtime.onMessage.addListener(handleMessage);

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
  console.log("Sending tab URL update:", {
    tabId: tab.id,
    url: tab.url,
    windowId: tab.windowId,
  });
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
  // In your SPA navigation handler:
  urlActions.forEach(({ match, action }) => {
    if (match(currentUrl)) {
      action(tabId);
    }
  });

  // Remove the tooltip if not on hold page
  if (!currentUrl.includes("catalog/hold/")) {
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const tooltip = document.querySelector("#keyboard-cowboy-tooltip");
        if (tooltip) tooltip.remove();
      },
    });
  }
});
