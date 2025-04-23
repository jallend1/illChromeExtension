// TODO: Add check if request is retrieved directly or the queue and modify querySelector as appropriate
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
  };

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
          // Resolves with null cuz we don't need to be throwing errors around willy nilly
          resolve(null);
        }
      }, 100);
    });

  const runWorldShareMods = async () => {
    const applyEmphasisStyle = (el, color) => {
      el.style.backgroundColor = color;
      el.style.color = "white";
      el.style.padding = "0.4rem";
      el.style.borderRadius = "0.5rem";
      el.style.fontWeight = "bold";
    };

    const highlightRequestStatus = async () => {
      // TODO: This variable works when it is the queue, but not when pulled up directly
      // const requestStatus = await waitForElementWithInterval(
      //   "#requests > div:not([class*='hidden']) span[data='requestStatus']"
      // );
      const requestStatus = await waitForElementWithInterval(
        "div:not(.yui3-default-hidden) span[data='requestStatus']:not(div.yui3-default-hidden span)"
      );
      if (!requestStatus) return;
      // If the request status is recalled, emphasize it
      if (requestStatus.innerText.includes("Recalled"))
        applyEmphasisStyle(requestStatus, "red");
      // If request is received, check for existence of 'Overdue' in the disposition element
      else if (requestStatus.innerText.includes("Received")) {
        // TODO: This variable works when it is the queue, but not when pulled up directly
        // const dispositionElement = document.querySelector(
        //   "#requests > div:not([class*='hidden']) span[data='disposition']"
        // );
        const dispositionElement = document.querySelector(
          "div:not(.yui3-default-hidden) span[data='disposition']:not(div.yui3-default-hidden span)"
        )
        if (
          dispositionElement &&
          dispositionElement.innerText.includes("Overdue")
        ) {
          applyEmphasisStyle(dispositionElement, "red");
        }
      }
    };
    const highlightDueDate = async () => {
      // TODO: This variable works when it is the queue, but not when pulled up directly
      // const dueDateElement = await waitForElementWithInterval(
      //   '#requests > div:not([class*="hidden"]) span[data="returning.originalDueToSupplier"]'
      // );
      const dueDateElement = await waitForElementWithInterval(
       'div:not(.yui3-default-hidden) span[data="returning.originalDueToSupplier"]:not(div.yui3-default-hidden span)'
      );
      try {
        if (!dueDateElement) return;
        const diffDays = calculateTimeDiff(dueDateElement.innerText);
        // If due date is today or in the past, emphasize it
        if (diffDays <= 0) {
          // TODO: This variable works when it is the queue, but not when pulled up directly
          // const requestStatus = await waitForElementWithInterval(
          //   "#requests > div:not([class*='hidden']) span[data='requestStatus']"
          // );
          const requestStatus = await waitForElementWithInterval(
            "div:not(.yui3-default-hidden) span[data='requestStatus']:not(div.yui3-default-hidden span)"
          )
          // Don't highlight red if the request is returned
          if (requestStatus && !requestStatus.innerText.includes("Returned")) {
            applyEmphasisStyle(dueDateElement, "red");
            // TODO: This variable works when it is the queue, but not when pulled up directly
            // const requestHeader = document.querySelector(
            //   "#requests > div:not([class*='hidden']) .nd-request-header"
            // );
            const requestHeader = document.querySelector(
              "div:not(.yui3-default-hidden) .nd-request-header:not(div.yui3-default-hidden .nd-request-header)"
            );
            // #requestSearchResults
            requestHeader.style.backgroundColor = "#f8d7da";
          }
        } else if (diffDays >= 21) {
          applyEmphasisStyle(dueDateElement, "green");
          //TODO: This variable works when it is the queue, but not when pulled up directly
          // const requestHeader = document.querySelector(
          //   "#requests > div:not([class*='hidden']) .nd-request-header"
          // );
          const requestHeader = document.querySelector(
            "div:not(.yui3-default-hidden) .nd-request-header:not(div.yui3-default-hidden .nd-request-header)"
          );
          requestHeader.style.backgroundColor = "#d4f0d4";
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
  };

  const monitorUrlChanges = () => {
    console.log("Monitoring URL changes...");
    const observer = new MutationObserver(() => {
      if (window.location.href !== window.currentUrl) {
        console.log("URL changed:", window.location.href);
        window.currentUrl = window.location.href; // Update the current URL
        if (isTargetUrl(window.currentUrl)) runWorldShareMods();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("beforeunload", () => {
      observer.disconnect();
    });
  };

  // Runs the script initially when the page loads
  if (isTargetUrl(window.currentUrl)) runWorldShareMods();

  // Sets up a MutationObserver to monitor URL changes
  // and reruns the script when we got a new URL
  monitorUrlChanges();
}
