export const urlActions = [
  {
    match: (url) => url.includes("/eg2/en-US/staff/"),
    action: (tabId) => {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ["./scripts/frequentLending.js"],
      });
    },
  },
  {
    match: (url) => url.includes("/cat/ill/track"),
    action: (tabId) => {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ["./scripts/createILLPageMods.js"],
      });
      chrome.scripting.insertCSS({
        target: { tabId },
        files: ["./styles/createILLPage.css"],
      });
    },
  },
  {
    match: (url) => url.includes("catalog/hold/"),
    action: (tabId) => {
      chrome.scripting.insertCSS({
        target: { tabId },
        files: ["./styles/warning.css"],
      });
      chrome.scripting.executeScript({
        target: { tabId },
        files: ["./scripts/holdScreenMods.js"],
      });
    },
  },
  {
    match: (url) => url.includes("/catalog/search?"),
    action: (tabId) => {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ["./scripts/searchResults.js"],
      });
    },
  },
  {
    match: (url) => url.includes("/circ/patron/register"),
    action: (tabId) => {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ["./scripts/updateAddress.js"],
      });
    },
  },
  {
    match: (url) => url.includes("/circ/patron/2372046/checkout"),
    action: (tabId) => {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ["./scripts/adjustBellinghamDate.js"],
      });
    },
  },
  {
    match: (url) => url.includes("share.worldcat.org"),
    action: (tabId) => {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ["./scripts/worldShareMods.js"],
      });
    },
  },
  {
    match: (url) => url.includes("/staff/cat/requests"),
    action: (tabId) => {
      console.log("Sending again");
      chrome.scripting.executeScript({
        target: { tabId },
        files: ["./scripts/requestManagerMods.js"],
      });
    },
  },
  {
    match: (url) => url.includes("/checkout"),
    action: (tabId) => {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ["./scripts/dismissOpenTransit.js"],
      });
    },
  },
];
