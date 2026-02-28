/**
 * Parses mailData CSV file and returns the parsed data
 * @returns {Promise<Object|null>} Parsed CSV data or null on error
 */
export const parseMailData = async () => {
  const mailDataUrl = chrome.runtime.getURL("data/mailData - 2025.csv");
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

/**
 * Toggles the visibility of a section with animation
 * @param {HTMLElement} toggle - The toggle element
 * @param {HTMLElement} mainSection - The main section to show/hide
 */
export const toggleSection = (toggle, mainSection) => {
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
 * Initiates the specified script in the active tab
 * @param {string} scriptName - The name of the script to initiate
 */
export const initiateScript = (scriptName) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    chrome.tabs.update(currentTab.id, { active: true });
    chrome.runtime.sendMessage({ command: scriptName, data: scriptName });
  });
};

/**
 * Gets a storage value and updates an element
 * @param {string} key - The storage key
 * @param {HTMLElement} element - The element to update
 */
export const getStorageValue = (key, element) => {
  chrome.storage.local.get(key, (result) => {
    if (element) {
      element.checked = result[key];
    }
  });
};

/**
 * Adds a checkbox listener for storage updates
 * @param {HTMLElement} checkbox - The checkbox element
 * @param {string} key - The storage key
 */
export const addCheckboxListener = (checkbox, key) => {
  if (checkbox) {
    checkbox.addEventListener("click", () => {
      chrome.storage.local.set({ [key]: checkbox.checked });
    });
  }
};
