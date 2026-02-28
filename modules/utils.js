export const waitForElementWithInterval = (selectorOrFunction) =>
  new Promise((resolve) => {
    const find =
      typeof selectorOrFunction === "function"
        ? selectorOrFunction
        : () => document.querySelector(selectorOrFunction);

    // Check if element is already present before observing
    const existing = find();
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = find();
      if (element) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(element);
      }
    });

    // Resolves with null cuz we don't need to be throwing errors around willy nilly
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, 10000);

    // Observe childList (element additions) and attributes (class/visibility changes)
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  });

export const buttonStyles = {
  background: "linear-gradient(135deg, #f5f7fa 0%, #e2e6ea 100%)",
  color: "#222",
  border: "1px solid #ccc",
  borderRadius: "8px",
  padding: "0.5em 1em",
  fontSize: "0.55rem",
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

export const ignoreHiddenElements = (selector) => {
  const elements = document.querySelectorAll(selector);
  for (const el of elements) {
    // Ignore elements inside a hidden container
    if (!el.closest(".yui3-cardpanel-hidden, .yui3-default-hidden")) {
      return el;
    }
  }
  return null;
};

// Examines URL to determine if the active page is a lending request
export const isLendingRequestPage = async () => {
  if (window.location.href.includes("lendingSubmittedLoan")) return true;
  const isQueueUrl = window.currentUrl.includes("queue");
  let borrowingLibrary;
  isQueueUrl
    ? (borrowingLibrary = await waitForElementWithInterval(
        "#requests > div:not([class*='hidden']) span.borrowingLibraryExtra"
      ))
    : (borrowingLibrary = await waitForElementWithInterval(
        "div:not(.yui3-default-hidden) span.borrowingLibraryExtra"
      ));
  if (!borrowingLibrary) return false;
  return !borrowingLibrary.textContent.includes("NTG");
};
