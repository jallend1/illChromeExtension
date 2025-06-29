let myWindowId = null;

chrome.windows.getCurrent((currentWindow) => {
  myWindowId = currentWindow.id;
  chrome.runtime.sendMessage({
    type: "sidepanel-open",
    windowId: myWindowId,
  });

  window.addEventListener("unload", () => {
    chrome.runtime.sendMessage({
      type: "sidepanel-close",
      windowId: myWindowId,
    });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "tab-url-updated" && message.windowId === myWindowId) {
    currentTabUrl = message.url || "";
    handleURLChange(currentTabUrl);
    sendResponse && sendResponse({ status: "URL handled" });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "requestManagerPatronUpdated") {
    chrome.storage.local.get("requestManagerPatron", (data) => {
      if (data.requestManagerPatron) {
        currentPatronInfo.textContent = data.requestManagerPatron.name;
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "storage-updated") {
    for (const [key, { newValue }] of Object.entries(message.changes)) {
      const storageKey = storageKeys.find((sk) => sk.key === key);
      if (storageKey && storageKey.element) {
        storageKey.element.checked = newValue;
      }
    }
  }
});

const elements = {
  collapseToggle: document.querySelectorAll("img.collapsible"),
  illActions: document.querySelectorAll(".ill-actions"),
  isbnSearch: document.querySelector("#isbn-search"),
  disableButton: document.querySelector("#disable-extension"),
  autoReceiveRequestButton: document.querySelector("#auto-receive-request"),
  lendingMode: document.querySelector("#lending-tools"),
  passiveTools: document.querySelector("#passive-tools"),
  printLabel: document.querySelector("#print-label"),
  autoReturnILL: document.querySelector("#auto-return-ill"),
  importMailroomData: document.querySelector("#import-mailroom-data"),
};

const storageKeys = [
  { key: "autoReceiveRequest", element: elements.autoReceiveRequestButton },
  { key: "lendingMode", element: elements.lendingMode },
  { key: "arePassiveToolsActive", element: elements.passiveTools },
  { key: "printLabel", element: elements.printLabel },
  { key: "autoReturnILL", element: elements.autoReturnILL },
  { key: "mailData", element: elements.importMailroomData },
];

// Renders current patron information in local storage from request manager
const currentPatronInfo = document.querySelector("#currentPatronInfo");
console.log(currentPatronInfo);
// Check local storage for requestManagerPatron and if it exists, insert requestManagerPatron.name
chrome.storage.local.get("requestManagerPatron", (data) => {
  console.log(data);
  if (data.requestManagerPatron) {
    currentPatronInfo.textContent = data.requestManagerPatron.name;
  }
});

// Parses mailData CSV file and returns the parsed data
const parseMailData = async () => {
  const mailDataUrl = chrome.runtime.getURL("data/mailData.csv");
  try {
    const response = await fetch(mailDataUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    const parsedData = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });
    return parsedData;
  } catch (error) {
    console.error("Error fetching or parsing mailData:", error);
    return null;
  }
};

const evergreenButtonIds = ["updateAddress", "overdueNotice"];
const worldShareButtonIds = [
  "copyFromOCLC",
  "copyWorldShareAddress",
  "isbnSearch",
];

const handleURLChange = (url) => {
  // Always disable all buttons first
  console.log("Disabling all buttons. Current URL:", url);
  disableButtons(evergreenButtonIds);
  disableButtons(worldShareButtonIds);

  // Only enable if the URL matches
  if (typeof url === "string" && url.includes(".kcls.org/eg2/en-US/staff/")) {
    console.log("Enabling Evergreen buttons. Current URL:", url);
    enableButtons(evergreenButtonIds);
  }
  if (
    typeof url === "string" &&
    url.includes("kingcountylibrarysystem.share.worldcat.org")
  ) {
    console.log("Enabling WorldShare buttons. Current URL:", url);
    enableButtons(worldShareButtonIds);
  }
};

let currentTabUrl = "";

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentTab = tabs[0];
  currentTabUrl = currentTab.url;
  handleURLChange(currentTabUrl);
});

const enableButtons = (buttonIds) => {
  buttonIds.forEach((buttonId) => {
    const button = document.querySelector(`#${buttonId}`);
    if (button) {
      button.disabled = false;
    }
  });
};

const disableButtons = (buttonIds) => {
  buttonIds.forEach((buttonId) => {
    const button = document.querySelector(`#${buttonId}`);
    if (button) {
      button.disabled = true;
    }
  });
};

const getStorageValue = (key, element) => {
  chrome.storage.local.get(key, (result) => {
    element.checked = result[key];
  });
};

storageKeys.forEach((storageKey) => {
  getStorageValue(storageKey.key, storageKey.element);
});

const initiateScript = (scriptName) => {
  // Focus on the tab that the user is currently on
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var currentTab = tabs[0];
    chrome.tabs.update(currentTab.id, { active: true });
    // TODO: Navigating to a new URL in isbnSearch closes the port before a message can be sent
    // A callback causes an error, so calling it specifically for isbnSearch. Would like to clean up
    if (scriptName === "isbnSearch") {
      chrome.runtime.sendMessage({ command: "isbnSearch", data: "isbnSearch" });
      return;
    } else {
      chrome.runtime.sendMessage(
        { command: scriptName, data: scriptName },
        async (response) => {
          // Extract address from storage if the script is copyWorldShareAddress to get around clipboard copying restrictions
          if (scriptName === "copyWorldShareAddress") {
            chrome.runtime.onMessage.addListener(async function handler(msg) {
              if (msg.type === "addressReady") {
                await navigator.clipboard.writeText("");
                await extractFromStorage("addressString");
                // extractFromStorage("addressString");
                chrome.runtime.onMessage.removeListener(handler);
              }
            });
            return;
          } else if (scriptName === "copyPatronFromRM") {
            chrome.runtime.sendMessage({ command: "copyPatronFromRM" });
            // Don't send data: scriptName, so background doesn't try to load undefined.js AGAIN
            // chrome.runtime.onMessage.addListener(async function handler(msg) {
            //   if (msg.type === "requestManagerPatronReady") {
            //     await navigator.clipboard.writeText("");
            //     await extractFromStorage("requestManagerPatron");
            //     chrome.runtime.onMessage.removeListener(handler);
            //   }
            // });
            return;
          } else if (scriptName === "overdueNotice") {
            chrome.runtime.onMessage.addListener(async function handler(msg) {
              if (msg.type === "overdueNoticeReady") {
                await navigator.clipboard.writeText("");
                await extractFromStorage("overdueNotice");
                chrome.runtime.onMessage.removeListener(handler);
              }
            });
          }
        }
      );
    }
  });
};

const extractFromStorage = async (key) => {
  console.log(`Extracting ${key} from storage...`);
  const result = await new Promise((resolve) =>
    chrome.storage.local.get(key, resolve)
  );
  console.log(`Extracted ${key} from storage:`, result[key]);
  if (result[key]) {
    try {
      await navigator.clipboard.writeText(result[key]);
      console.log(`Copied ${key} to clipboard:`);
      chrome.storage.local.remove(key);
    } catch (error) {
      console.error(`Failed to copy ${key} to clipboard`, error);
    }
  }
};

const toggleSection = (toggle, mainSection) => {
  const isCollapsed = mainSection.classList.contains("collapsed");
  if (isCollapsed) {
    mainSection.classList.remove("hidden");
    requestAnimationFrame(() => {
      mainSection.classList.remove("collapsed");
    });
    toggle.classList.add("rotated");
  } else {
    mainSection.classList.add("collapsed");
    setTimeout(() => {
      mainSection.classList.add("hidden");
    }, 300);
    toggle.classList.remove("rotated");
  }
};

const addEventListeners = () => {
  elements.passiveTools.addEventListener("click", () => {
    chrome.storage.local.get("arePassiveToolsActive", (result) => {
      // Send message to background.js to toggle extension status
      chrome.storage.local.set(
        {
          arePassiveToolsActive: !result.arePassiveToolsActive,
        },
        () => {
          arePassiveToolsActive = !result.arePassiveToolsActive;
          elements.passiveTools.checked = arePassiveToolsActive;
          chrome.runtime.sendMessage({
            command: "toggleExtension",
          });
        }
      );
    });
  });

  elements.illActions.forEach((button) => {
    button.addEventListener("click", (event) => {
      const buttonId = event.target.id;
      initiateScript(buttonId);
    });
  });

  elements.collapseToggle.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const mainSection = toggle.parentElement.nextElementSibling;
      toggleSection(toggle, mainSection);
    });
  });

  elements.disableButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ command: "disableButton" });
  });

  elements.lendingMode.addEventListener("click", () => {
    initiateScript("frequentLending");
    elements.lendingMode.checked
      ? chrome.storage.local.set({ lendingMode: true })
      : chrome.storage.local.set({ lendingMode: false });
  });

  elements.importMailroomData.addEventListener("click", async () => {
    const mailData = await parseMailData();
    if (mailData) {
      chrome.storage.local.set({ mailData: mailData.data });
      alert("Mailroom data imported successfully!");
    } else {
      alert("Failed to import mailroom data.");
    }
  });

  const addCheckboxListener = (checkbox, key) => {
    checkbox.addEventListener("click", () => {
      chrome.storage.local.set({ [key]: checkbox.checked });
    });
  };

  addCheckboxListener(elements.autoReceiveRequestButton, "autoReceiveRequest");
  addCheckboxListener(elements.printLabel, "printLabel");
  addCheckboxListener(elements.autoReturnILL, "autoReturnILL");
};

addEventListeners();

document.addEventListener("DOMContentLoaded", () => {
  if (!chrome.commands) return;
  chrome.commands.getAll((commands) => {
    commands.forEach((cmd) => {
      if (cmd.shortcut) {
        const tooltip = document.querySelector(`#${cmd.name} .tooltiptext`);
        if (tooltip) {
          tooltip.textContent = `Press ${cmd.shortcut}`;
        }
      }
    });
  });
});
