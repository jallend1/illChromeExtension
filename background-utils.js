export const URLS = {
  CLIENT_BASE: "https://evgclient.kcls.org",
  MOBILE_BASE: "https://evgmobile.kcls.org",
  PATRON_SEARCH: "/eg2/en-US/staff/circ/patron/bcsearch",
  CREATE_ILL: "/eg2/en-US/staff/cat/ill/track",
  CATALOG: "/eg2/en-US/staff/catalog",
};

export const getBaseURL = async (urlSuffix) => {
  const needsMobileUrl = await isEvgMobile();
  return needsMobileUrl
    ? URLS.MOBILE_BASE + urlSuffix
    : URLS.CLIENT_BASE + urlSuffix;
};

export const focusOrCreateTab = async (url) => {
  const evergreenTab = await evergreenTabId();
  if (evergreenTab) {
    updateTab(evergreenTab, url);
  } else {
    createTab(url);
  }
};

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

export const isAllowedHost = (url) => {
  const manifest = chrome.runtime.getManifest();
  const allowedHosts = manifest.host_permissions || [];
  return allowedHosts.some((pattern) => {
    const urlPattern = new URLPattern(pattern);
    return urlPattern.test(url);
  });
};

export const isEvgMobile = async () => {
  const tabs = await chrome.tabs.query({});
  return tabs.some((tab) => tab.url.includes("evgmobile"));
};

export const evergreenTabId = async () => {
  const tabs = await chrome.tabs.query({});
  for (let tab of tabs) {
    if (tab.url.includes("evgclient") || tab.url.includes("evgmobile")) {
      return tab.id;
    }
  }
  return null;
};
