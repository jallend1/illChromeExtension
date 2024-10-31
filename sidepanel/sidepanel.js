const collapseToggle = document.querySelectorAll("img.collapsible");
const illActions = document.querySelectorAll(".ill-actions");
const logoLeft = document.querySelector("#logo-left");
const logoRight = document.querySelector("#logo-right");
const modeToggle = document.querySelector("#mode");
const darkModeToggle = document.querySelector("#dark-mode");
// const moreInfoButtons = document.querySelectorAll(".more-info");
const isbnSearch = document.querySelector("#isbn-search");
const extensionStatusButton = document.querySelector("#extension-status");
let arePassiveToolsActive = chrome.storage.local.get(
  "arePassiveToolsActive",
  (result) => {
    extensionStatusButton.textContent = result.arePassiveToolsActive
      ? "Disable Passive Tools"
      : "Enable Passive Tools";
  }
);

const lendingMode = document.querySelector("#lending-mode");
// Sets lendingMode text to match current state
let lendingModeStatus = chrome.storage.local.get("lendingMode", (result) => {
  lendingMode.textContent = result.lendingMode
    ? "Disable Lending Mode"
    : "Enable Lending Mode";
});

const initiateScript = (scriptName) => {
  // Focus on the tab that the user is currently on
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var currentTab = tabs[0];
    chrome.tabs.update(currentTab.id, { active: true });
    chrome.runtime.sendMessage(
      { command: scriptName, data: scriptName },
      async (response) => {
        // Extract address from storage if the script is copyWorldShareAddress to get around clipboard copying restrictions
        if (scriptName === "copyWorldShareAddress") {
          await navigator.clipboard.writeText("");
          await extractFromStorage("addressString");
        } else if (scriptName === "overdueNotice") {
          await navigator.clipboard.writeText("");
          await extractFromStorage("overdueNotice");
        }
      }
    );
    // }
  });
};

const extractFromStorage = async (key) => {
  const result = await new Promise((resolve) =>
    chrome.storage.local.get(key, resolve)
  );
  if (result[key]) {
    try {
      await navigator.clipboard.writeText(result[key]);
      chrome.storage.local.remove(key);
    } catch (error) {
      console.error(`Failed to copy ${key} to clipboard`, error);
    }
  }
};

const addEventListeners = () => {
  extensionStatusButton.addEventListener("click", () => {
    chrome.storage.local.get("arePassiveToolsActive", (result) => {
      // Send message to background.js to toggle extension status
      chrome.storage.local.set(
        {
          arePassiveToolsActive: !result.arePassiveToolsActive,
        },
        () => {
          arePassiveToolsActive = !result.arePassiveToolsActive;
          extensionStatusButton.textContent = arePassiveToolsActive
            ? "Disable Tools"
            : "Enable Tools";
          chrome.runtime.sendMessage({
            command: "toggleExtension",
          });
        }
      );
    });
  });

  illActions.forEach((button) => {
    button.addEventListener("click", (event) => {
      const buttonId = event.target.id;
      initiateScript(buttonId);
    });
  });

  logoLeft.addEventListener("click", () => {
    logoLeft.classList.toggle("logo-left-animation");
  });

  logoRight.addEventListener("click", () => {
    logoRight.classList.toggle("logo-right-animation");
  });

  collapseToggle.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const mainSection = toggle.parentElement.nextElementSibling;
      if (mainSection.classList.contains("collapsed")) {
        mainSection.classList.remove("hidden");
        requestAnimationFrame(() => {
          mainSection.classList.remove("collapsed");
        });
      } else {
        mainSection.classList.add("collapsed");
        toggle.textContent = "Expand";
        setTimeout(() => {
          mainSection.classList.add("hidden");
        }, 300);
      }
      if (toggle.src.includes("collapse")) {
        toggle.src = chrome.runtime.getURL("images/expand.svg");
      } else {
        toggle.src = chrome.runtime.getURL("images/collapse.svg");
      }
    });
  });

  modeToggle.addEventListener("click", () => {
    const body = document.querySelector("body");
    const isVibrantMode = modeToggle.textContent === "Vibrant Mode";
    body.classList.toggle("fun-mode", isVibrantMode);
    body.classList.toggle("dreary-mode", !isVibrantMode);
    modeToggle.textContent = isVibrantMode ? "Evergreen Mode" : "Vibrant Mode";
  });

  lendingMode.addEventListener("click", () => {
    initiateScript("frequentLending");
    chrome.storage.local.get("lendingMode", (result) => {
      chrome.storage.local.set(
        {
          lendingMode: !result.lendingMode,
        },
        () => {
          lendingModeStatus = !result.lendingMode;
          lendingMode.textContent = lendingModeStatus
            ? "Disable Lending Mode"
            : "Enable Lending Mode";
        }
      );
    });
  });

  darkModeToggle.addEventListener("click", () => {
    console.log("Dark mode clicked");
    initiateScript("darkMode");
  });
};

addEventListeners();
