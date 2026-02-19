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
 * Extracts a value from storage and copies it to the clipboard
 * @param {string} key - The key of the value to extract
 * @returns {Promise<void>}
 * @throws {Error} If the extraction fails
 * @description This function retrieves a value from Chrome's local storage,
 * copies it to the clipboard, and then removes it from storage.
 */
export const extractFromStorage = async (key) => {
  console.log(`Extracting ${key} from storage...`);
  try {
    const result = await new Promise((resolve) =>
      chrome.storage.local.get(key, resolve)
    );
    console.log(`Extracted ${key} from storage:`, result[key]);

    if (result[key]) {
      await navigator.clipboard.writeText(result[key]);
      console.log(`Copied ${key} to clipboard`);
      chrome.storage.local.remove(key);
    }
  } catch (error) {
    console.error(`Failed to copy ${key} to clipboard`, error);
  }
};

/**
 * Extracts a {text, html} value from storage and copies it to the clipboard
 * as rich content so Word, Outlook, and Excel preserve formatting on paste.
 * @param {string} key - The key of the value to extract
 * @returns {Promise<void>}
 */
export const extractRichFromStorage = async (key) => {
  console.log(`Extracting rich content for ${key} from storage...`);
  try {
    const result = await new Promise((resolve) =>
      chrome.storage.local.get(key, resolve)
    );
    const data = result[key];
    if (data) {
      const htmlBlob = new Blob([data.html], { type: "text/html" });
      const textBlob = new Blob([data.text], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({ "text/html": htmlBlob, "text/plain": textBlob }),
      ]);
      console.log(`Copied rich ${key} to clipboard`);
      chrome.storage.local.remove(key);
    }
  } catch (error) {
    console.error(`Failed to copy rich ${key} to clipboard`, error);
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
