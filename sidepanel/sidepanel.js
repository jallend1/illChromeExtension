import {
  elements,
  storageKeys,
  SCRIPTS_WITHOUT_CALLBACKS,
  URL_PATTERNS,
} from "./constants.js";

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
  console.log("Message type:", message.type);

  // Handle tab URL updates
  if (message.type === "tab-url-updated" && message.windowId === myWindowId) {
    console.log("Tab URL updated:", message.url);
    currentTabUrl = message.url || "";
    handleURLChange(currentTabUrl);
    sendResponse && sendResponse({ status: "URL handled" });
    return;
  }

  // Handle storage updates
  if (message.type === "storage-updated") {
    for (const [key, { newValue }] of Object.entries(message.changes)) {
      const storageKey = storageKeys.find((sk) => sk.key === key);
      if (storageKey && storageKey.element) {
        storageKey.element.checked = newValue;
      }
    }
    return;
  }

  // Handle script-to-sidepanel messages
  if (message.type === "addressReady") {
    extractFromStorage("addressString");
    return;
  }

  if (message.type === "overdueNoticeReady") {
    extractFromStorage("overdueNotice");
    return;
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

/**
 * Handles changes to the active tab's URL.
 * @param {string} url - The new URL of the active tab.
 * @returns {void}
 */
const handleURLChange = (url) => {
  console.log("Handling URL change:", url);

  // Always disable all buttons first
  disableButtons(evergreenButtonIds);
  disableButtons(worldShareButtonIds);

  if (typeof url !== "string") {
    console.warn("URL is not a string:", typeof url);
    return;
  }

  // Enable appropriate buttons based on URL
  if (url.includes(URL_PATTERNS.EVERGREEN)) {
    console.log("Enabling Evergreen buttons for:", url);
    enableButtons(evergreenButtonIds);
  }

  if (url.includes(URL_PATTERNS.WORLDSHARE)) {
    console.log("Enabling WorldShare buttons for:", url);
    enableButtons(worldShareButtonIds);
  }
};

let currentTabUrl = "";

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentTab = tabs[0];
  currentTabUrl = currentTab.url;
  handleURLChange(currentTabUrl);
});

/**
 * Enables the specified buttons.
 * @param {string[]} buttonIds - The IDs of the buttons to enable.
 */
const enableButtons = (buttonIds) => {
  console.log("enableButtons called with:", buttonIds);
  buttonIds.forEach((buttonId) => {
    const button = document.querySelector(`#${buttonId}`);
    console.log(
      `Button ${buttonId}:`,
      button,
      "disabled before:",
      button?.disabled
    );
    if (button) {
      button.disabled = false;
      console.log(`Button ${buttonId} disabled after:`, button.disabled);
    } else {
      console.log(`Button with ID ${buttonId} not found in DOM`);
    }
  });
};

/**
 * Disables the specified buttons.
 * @param {string[]} buttonIds - The IDs of the buttons to disable.
 */
const disableButtons = (buttonIds) => {
  console.log("disableButtons called with:", buttonIds);
  buttonIds.forEach((buttonId) => {
    const button = document.querySelector(`#${buttonId}`);
    if (button) {
      button.disabled = true;
      console.log(`Button ${buttonId} disabled:`, button.disabled);
    }
  });
};

/**
 * Retrieves a value from storage and updates the corresponding element.
 * @param {string} key - The key of the value to retrieve.
 * @param {HTMLElement} element - The element to update with the retrieved value.
 */
const getStorageValue = (key, element) => {
  chrome.storage.local.get(key, (result) => {
    element.checked = result[key];
  });
};

storageKeys.forEach((storageKey) => {
  getStorageValue(storageKey.key, storageKey.element);
});

/**
 * Initiates the specified script in the active tab.
 * @param {string} scriptName - The name of the script to initiate.
 */
const initiateScript = (scriptName) => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0];
    chrome.tabs.update(currentTab.id, { active: true });

    // Scripts that don't need callback handling
    if (SCRIPTS_WITHOUT_CALLBACKS.includes(scriptName)) {
      chrome.runtime.sendMessage({ command: scriptName, data: scriptName });
      return;
    }

    // Scripts that need callback handling
    chrome.runtime.sendMessage({ command: scriptName, data: scriptName });
  });
};

/**
 * Extracts a value from storage and copies it to the clipboard.
 * @param {string} key - The key of the value to extract.
 */
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

/**
 * Toggles the visibility of a section.
 * @param {HTMLElement} toggle - The toggle element.
 * @param {HTMLElement} mainSection - The main section to show/hide.
 */
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

/**
 * Adds event listeners to the sidepanel elements.
 */
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

  /**
   * Adds a click listener to the checkbox and updates the storage value.
   * @param {HTMLElement} checkbox - The checkbox element.
   * @param {string} key - The key to store the checkbox state.
   */
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
