export const applyStyles = (element, styles) => {
  for (const property in styles) {
    element.style[property] = styles[property];
  }
};

export const waitForElementWithInterval = (selectorOrFunction) =>
  new Promise((resolve, reject) => {
    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const element =
        typeof selectorOrFunction === "function"
          ? selectorOrFunction()
          : document.querySelector(selectorOrFunction);
      if (element) {
        clearInterval(intervalId); // Clears interval when element is found
        resolve(element);
      } else if (Date.now() - startTime > 10000) {
        clearInterval(intervalId);
        // Resolves with null cuz we don't need to be throwing errors around willy nilly
        resolve(null);
      }
    }, 100);
  });

export const buttonStyles = {
  background: "linear-gradient(135deg, #f5f7fa 0%, #e2e6ea 100%)",
  color: "#222",
  border: "1px solid #ccc",
  borderRadius: "8px",
  padding: "0.6em 1.2em",
  fontSize: "0.65rem",
  fontWeight: "bold",
  fontFamily: "Arial, sans-serif",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  letterSpacing: "0.03em",
  cursor: "pointer",
  marginTop: "0",
  outline: "none",
  transition: "background 0.2s, transform 0.15s, box-shadow 0.2s",
  transform: "none",
  display: "block",
  margin: "0 0.25rem",
};

export const hoverStyles = {
  ...buttonStyles,
  background: "linear-gradient(135deg, #e2e6ea 0%, #f5f7fa 100%)", // Reverse subtle gradient
  boxShadow: "0 4px 16px rgba(0,0,0,0.13)",
  transform: "translateY(-2px) scale(1.04)",
};

// -- Background Script Functions --

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
