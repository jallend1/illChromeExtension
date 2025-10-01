import { URLS } from "./modules/constants.js";

// === URL Management ===
/**
 * Determines the base URL for Evergreen based on the user's Evergreen type (mobile or client).
 * @param {string} urlSuffix - The suffix to append to the base URL
 * @returns {Promise<string>} - The complete URL based on the user's Evergreen type
 */
export const getBaseURL = async (urlSuffix) => {
  const needsMobileUrl = await isEvgMobile();
  return needsMobileUrl
    ? URLS.MOBILE_BASE + urlSuffix
    : URLS.CLIENT_BASE + urlSuffix;
};

/**
 * Determines if the given URL is allowed based on the extension's host permissions.
 * @param {string} url - The URL to check
 * @returns {boolean} - Whether the URL is allowed based on the extension's host permissions
 */

export const isAllowedHost = (url) => {
  // const manifest = chrome.runtime.getManifest();
  // const allowedHosts = manifest.host_permissions || [];
  // return allowedHosts.some((pattern) => {
  //   const urlPattern = new URLPattern(pattern);
  //   return urlPattern.test(url);
  // });
  // Trying it without URLPattern cuz things ain't working quite right
  const manifest = chrome.runtime.getManifest();
  const allowedHosts = manifest.host_permissions || [];

  console.log("Checking URL:", url);
  console.log("Against host permissions:", allowedHosts);

  return allowedHosts.some((pattern) => {
    try {
      // Convert Chrome extension pattern to regex
      // Replace * with .* and escape special regex characters
      const regexPattern = pattern
        .replace(/\./g, "\\.") // Escape dots
        .replace(/\*/g, ".*"); // Replace * with .*

      const regex = new RegExp("^" + regexPattern + "$");
      const matches = regex.test(url);

      console.log(
        `Pattern: ${pattern} -> Regex: ${regexPattern} -> Match: ${matches}`
      );

      return matches;
    } catch (error) {
      console.error("Error testing URL pattern:", error);
      // Fallback to simple string matching
      const simpleMatch = url.includes(
        pattern.replace("https://", "").replace("/*", "")
      );
      console.log(`Fallback match for ${pattern}: ${simpleMatch}`);
      return simpleMatch;
    }
  });
};

/**
 * Checks if the current Evergreen tab is a mobile version.
 * @returns {Promise<boolean>} - True if the current Evergreen tab is mobile, false otherwise
 */
export const isEvgMobile = async () => {
  const tabs = await chrome.tabs.query({});
  return tabs.some((tab) => tab.url?.includes("evgmobile"));
};

// === Tab Management ===
/**
 * Focuses an existing Evergreen tab or creates a new one.
 * @param {string} url - Evergreen URL to focus or create a tab for
 * @returns {Promise<void>} - Focuses an existing Evergreen tab or creates a new one
 */
export const focusOrCreateTab = async (url) => {
  const evergreenTab = await evergreenTabId();
  if (evergreenTab) {
    await updateTab(evergreenTab, url);
  } else {
    await createTab(url);
  }
};

/**
 * Updates an existing Evergreen tab with a new URL.
 * @param {number} evergreenTab - The ID of the Evergreen tab to update
 * @param {string} url - The new URL to set for the tab
 * @return {void} - Updates the Evergreen tab with the new URL and focuses it
 */
export const updateTab = (evergreenTab, url) => {
  chrome.tabs.update(evergreenTab, { url: url, active: true }, () => {
    chrome.tabs.get(evergreenTab, (tab) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error retrieving tab details:",
          chrome.runtime.lastError.message
        );
        return;
      }
      chrome.windows.update(tab.windowId, { focused: true });
    });
  });
};

/**
 * Creates a new Evergreen tab with the specified URL.
 * @param {string} url - The URL to open in the new tab
 * @returns {void} - Creates a new tab with the specified URL and focuses it
 */
export const createTab = (url) => {
  chrome.tabs.create({ url: url, active: true }, (newTab) => {
    if (chrome.runtime.lastError) {
      console.error(
        "Error creating new tab:",
        chrome.runtime.lastError.message
      );
      return;
    }
    chrome.windows.update(newTab.windowId, { focused: true });
  });
};

/**
 * Retrieves the ID of the current Evergreen tab.
 * @returns {Promise<number|null>} - The ID of the Evergreen tab if it exists, null otherwise
 */
export const evergreenTabId = async () => {
  const tabs = await chrome.tabs.query({});
  for (let tab of tabs) {
    if (tab.url?.includes("evgclient") || tab.url?.includes("evgmobile")) {
      return tab.id;
    }
  }
  return null;
};

/**
 * Gets the currently active tab
 * @returns {Promise<chrome.tabs.Tab|null>}
 */
export const getActiveTab = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length > 0) {
    return tabs[0];
  } else {
    console.error("No active tab found.");
    return null;
  }
};
