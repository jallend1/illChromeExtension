import { executeScript } from "./modules/scriptExecutor.js";

// TODO: Adjust the URL_MAP to include multiple URLs for the same script (eg adjustBellinghamDate)
// Mapping URL patterns to their associated scripts and styles
const URL_MAP = {
  "/eg2/en-US/staff/": { scripts: ["frequentLending"] },
  "/cat/ill/track": {
    scripts: ["createILLPageMods"],
    styles: ["createILLPage"],
  },
  "catalog/hold/": { scripts: ["holdScreenMods"], styles: ["warning"] },
  "/catalog/search?": { scripts: ["searchResults"] },
  "/circ/patron/register": { scripts: ["updateAddress"] },
  "/circ/patron/2372046/checkout": { scripts: ["adjustBellinghamDate"] },
  "share.worldcat.org": { scripts: ["worldShareMods"] },
  "/staff/cat/requests": { scripts: ["requestManagerMods"] },
  "/checkout": { scripts: ["dismissOpenTransit"] },
};

/**
 * Executes the required scripts and styles for a given tab.
 * @param {number} tabId - The ID of the tab to execute actions in.
 * @param {Object} config - The configuration object containing scripts and styles.
 */
const executeActions = (tabId, config) => {
  config.styles?.forEach((style) => {
    chrome.scripting.insertCSS({
      target: { tabId },
      files: [`./styles/${style}.css`],
    });
  });
  config.scripts?.forEach((script) => executeScript(tabId, script));
};

/**
 * Generates an array of URL actions based on the URL_MAP configuration.
 * Each action includes a match function to identify relevant URLs
 * and an action function to execute the required scripts and styles.
 */
export const urlActions = [
  ...Object.entries(URL_MAP).map(([pattern, config]) => ({
    match: (url) => url.includes(pattern),
    action: (tabId) => executeActions(tabId, config),
  })),

  // Special case for removing tooltip
  {
    match: (url) => !url.includes("catalog/hold/"),
    action: (tabId) => {
      chrome.scripting.executeScript({
        target: { tabId },
        func: () =>
          document.querySelector("#keyboard-cowboy-tooltip")?.remove(),
      });
    },
  },
];
