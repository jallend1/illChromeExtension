import { executeScript } from "./modules/scriptExecutor.js";

// Simple mapping of URL patterns to their required resources
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

const executeActions = (tabId, config) => {
  config.styles?.forEach((style) => {
    chrome.scripting.insertCSS({
      target: { tabId },
      files: [`./styles/${style}.css`],
    });
  });
  config.scripts?.forEach((script) => executeScript(tabId, script));
};

// Generate urlActions array from URL_MAP
export const urlActions = [
  // Generate actions from URL_MAP
  ...Object.entries(URL_MAP).map(([pattern, config]) => ({
    match: (url) => url.includes(pattern),
    action: (tabId) => executeActions(tabId, config),
  })),

  // Special case for removing tooltips (negative match)
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
