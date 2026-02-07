import { executeScript } from "./modules/scriptExecutor.js";

const longDueDateIds = [
  2089608, 2191517, 2372046, 2381743, 2384875, 2645812, 2755234, 4465480,
];
const isLongCheckout = (url) => longDueDateIds.some((id) => url.includes(id));

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
  "share.worldcat.org": { scripts: ["worldShareMods"] },
  "/staff/cat/requests": { scripts: ["requestManagerMods"] },
  "/checkout": { scripts: ["dismissOpenTransit"] },
  "/en-US/staff/circ/patron/search": { scripts: ["patronSearchMods"] },
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
    match: (url) => {
      // console.log(`Checking URL: ${url} against pattern: ${pattern}`);
      const matches = url.includes(pattern);
      // console.log(`Match result: ${matches}`);
      return matches;
    },
    action: (tabId) => executeActions(tabId, config),
  })),
  // Special case for libraries with long checkout requirements
  {
    match: isLongCheckout,
    action: (tabId) =>
      executeActions(tabId, { scripts: ["adjustLongDueDate"] }),
  },

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
