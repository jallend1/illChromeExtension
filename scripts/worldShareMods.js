if (!window.worldShareModsInjected) {
  // Sets a flag on the window object to prevent the script from running multiple times
  window.worldShareModsInjected = true;
  window.currentUrl = window.location.href;

  const calculateTimeDiff = (dueDateString) => {
    const dueDate = new Date(dueDateString);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
    return diffDays;
  }

  const waitForElementWithInterval = (selectorOrFunction) =>
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
          resolve(null); // Resolves with null cuz we don't need to be throwing errors around willy nilly
          // reject(new Error(`Element not found. ${selectorOrFunction}`));
        }
      }, 100);
    });

  const runWorldShareMods = async () => {
    const applyWarningStyles = (el, color) => {
      el.style.backgroundColor = color;
      el.style.color = "white";
      el.style.padding = "0.4rem";
      el.style.borderRadius = "0.5rem";
      el.style.fontWeight = "bold";
    };

    const highlightRequestStatus = async () => {
      const requestStatus = await waitForElementWithInterval(
        "div:not(.yui3-default-hidden) span[data='requestStatus']:not(div.yui3-default-hidden span)"
      );
      if (!requestStatus) return;
      // If the request status is recalled, emphasize it
      if (requestStatus.innerText.includes("Recalled"))
        applyWarningStyles(requestStatus, "red");
      // If request is received, check for existence of 'Overdue' in the disposition element
      else if (requestStatus.innerText.includes("Received")) {
        const dispositionElement = document.querySelector(
          "div:not(.yui3-default-hidden) span[data='disposition']:not(div.yui3-default-hidden span)"
        );
        if (
          dispositionElement &&
          dispositionElement.innerText.includes("Overdue")
        ) {
          applyWarningStyles(dispositionElement, "red");
        }
      }
    };
    const highlightDueDate = async () => {
      const dueDateElement = await waitForElementWithInterval(
        'div:not(.yui3-default-hidden) span[data="returning.originalDueToSupplier"]:not(div.yui3-default-hidden span)'
      );
      try {
        if (!dueDateElement) return;
        const diffDays = calculateTimeDiff(dueDateElement.innerText);
        // If due date is today or in the past, emphasize it
        if (diffDays <= 0) applyWarningStyles(dueDateElement, "red");
        else if (diffDays >= 21) {
          applyWarningStyles(dueDateElement, "green");
        }
      } catch (error) {
        console.error("Error parsing due date:", error);
      }
    };
    highlightDueDate();
    highlightRequestStatus();
  };

  const isTargetUrl = (url) => {
    const requestUrlRegEx = /(\d{8,10})/;
    return url.match(requestUrlRegEx);
  }

  const monitorUrlChanges = () => {
    const observer = new MutationObserver(() => {
      if (window.location.href !== window.currentUrl) {
        window.currentUrl = window.location.href; // Update the current URL
        if(isTargetUrl(window.currentUrl)) runWorldShareMods();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("beforeunload", () => {
      observer.disconnect();
    });
  };

  // Runs the script initially when the page loads
  if(isTargetUrl(window.currentUrl)) runWorldShareMods();

  // Sets up a MutationObserver to monitor URL changes
  // and reruns the script when we got a new URL
  monitorUrlChanges();
}
