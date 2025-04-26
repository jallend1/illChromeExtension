const elements = {
  collapseToggle: document.querySelectorAll("img.collapsible"),
  illActions: document.querySelectorAll(".ill-actions"),
  isbnSearch: document.querySelector("#isbn-search"),
  countdownTimerElement: document.querySelector("#countdown"),
  countdownTextElement: document.querySelector("#countdown-text"),
  disableButton: document.querySelector("#disable-extension"),
  openCreateILL: document.querySelector("#open-create-ill"),
  autoReceiveRequestButton: document.querySelector("#auto-receive-request"),
  lendingMode: document.querySelector("#lending-tools"),
  passiveTools: document.querySelector("#passive-tools"),
  printLabel: document.querySelector("#print-label"),
  autoReturnILL: document.querySelector("#auto-return-ill"),
};

const storageKeys = [
  { key: "openCreateILL", element: elements.openCreateILL },
  { key: "autoReceiveRequest", element: elements.autoReceiveRequestButton },
  { key: "lendingMode", element: elements.lendingMode },
  { key: "arePassiveToolsActive", element: elements.passiveTools },
  { key: "printLabel", element: elements.printLabel },
  { key: "autoReturnILL", element: elements.autoReturnILL },
];

const branchHours = {
  0: { system: 11, bellevue: 11 },
  1: { system: 10, bellevue: 10 },
  2: { system: 12, bellevue: 11 },
  3: { system: 12, bellevue: 11 },
  4: { system: 10, bellevue: 10 },
  5: { system: 10, bellevue: 10 },
  6: { system: 11, bellevue: 11 },
};

const updateCountdownElement = (element, text, isAlert = false) => {
  element.textContent = text;
  if (isAlert) {
    element.classList.add("countdown-alert");
  } else {
    element.classList.remove("countdown-alert");
  }
};

const getFormattedTimeDifference = (openingTime, currentTime) => {
  const timeDifference = openingTime - currentTime;
  return calculateTime(timeDifference);
};

const countdownTimer = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const { system, bellevue } = branchHours[dayOfWeek];

  const openingTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    system,
    0,
    0
  );
  const bellevueOpeningTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    bellevue,
    0,
    0
  );

  if (today >= openingTime) {
    // All branches have opened
    updateCountdownElement(
      elements.countdownTimerElement,
      "All branches have opened for the day."
    );
    updateCountdownElement(elements.countdownTextElement, "", false);
    clearInterval(intervalID);
    return;
  }

  if (today >= bellevueOpeningTime) {
    // Bellevue has opened, others not yet
    const branchOpeningTime = getFormattedTimeDifference(openingTime, today);
    updateCountdownElement(
      elements.countdownTimerElement,
      "Bellevue has opened.",
      false
    );
    updateCountdownElement(
      elements.countdownTextElement,
      `Other branches: ${branchOpeningTime}`,
      branchOpeningTime.startsWith("00")
    );
    return;
  }

  // No branches have opened yet
  const bellevueTimeRemaining = getFormattedTimeDifference(
    bellevueOpeningTime,
    today
  );
  const systemTimeRemaining = getFormattedTimeDifference(openingTime, today);
  if (bellevue === system) {
    // Everybody opens at the same time
    updateCountdownElement(
      elements.countdownTimerElement,
      `Branches open in ${bellevueTimeRemaining}`,
      bellevueTimeRemaining.startsWith("00")
    );
  } else {
    // Bellevue and branches open at different times
    updateCountdownElement(
      elements.countdownTimerElement,
      `Bellevue opens in ${bellevueTimeRemaining}`,
      bellevueTimeRemaining.startsWith("00")
    );
    updateCountdownElement(
      elements.countdownTextElement,
      `Other branches: ${systemTimeRemaining}`,
      systemTimeRemaining.startsWith("00")
    );
  }
};

const intervalID = setInterval(countdownTimer, 1000);

const calculateTime = (timeDifference) => {
  const totalSeconds = Math.floor(timeDifference / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = Math.floor(totalSeconds % 60);
  const remainingHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = Math.floor(totalMinutes % 60);
  return `${remainingHours < 10 ? "0" + remainingHours : remainingHours}:${
    remainingMinutes < 10 ? "0" + remainingMinutes : remainingMinutes
  }:${remainingSeconds < 10 ? "0" + remainingSeconds : remainingSeconds}`;
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

const toggleSection = (toggle, mainSection) => {
  const isCollapsed = mainSection.classList.contains("collapsed");

  if (isCollapsed) {
    mainSection.classList.remove("hidden");
    requestAnimationFrame(() => {
      mainSection.classList.remove("collapsed");
    });
    toggle.src = chrome.runtime.getURL("images/collapse.svg");
  } else {
    mainSection.classList.add("collapsed");
    setTimeout(() => {
      mainSection.classList.add("hidden");
    }, 300);
    toggle.src = chrome.runtime.getURL("images/expand.svg");
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

  const addCheckboxListener = (checkbox, key) => {
    checkbox.addEventListener("click", () => {
      chrome.storage.local.set({ [key]: checkbox.checked });
    });
  };

  addCheckboxListener(elements.openCreateILL, "openCreateILL");
  addCheckboxListener(elements.autoReceiveRequestButton, "autoReceiveRequest");
  addCheckboxListener(elements.printLabel, "printLabel");
  addCheckboxListener(elements.autoReturnILL, "autoReturnILL");
};

addEventListeners();
