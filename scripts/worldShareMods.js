// TODO: Add check if request is retrieved directly or the queue and modify querySelector as appropriate
if (!window.worldShareModsInjected) {
  // Sets a flag on the window object to prevent the script from running multiple times
  window.worldShareModsInjected = true;
  window.currentUrl = window.location.href;
  // Check URL to see if it includes the word queue
  const isQueueUrl = window.currentUrl.includes("queue");
  console.log("isQueueUrl", isQueueUrl);
  const selectors = {
    queue: {
      requestHeader:
        "#requests > div:not([class*='hidden']) .nd-request-header",
      requestStatus:
        "#requests > div:not([class*='hidden']) span[data='requestStatus']",
      dispositionElement:
        "#requests > div:not([class*='hidden']) span[data='disposition']",
      dueDateElement:
        '#requests > div:not([class*="hidden"]) span[data="returning.originalDueToSupplier"]',
      renewalDueDateElement:
        '#requests > div:not([class*="hidden"]) span[data="returning.dueToSupplier"]',
    },
    direct: {
      requestHeader:
        "div:not(.yui3-default-hidden) .nd-request-header:not(div.yui3-default-hidden .nd-request-header)",
      requestStatus:
        "div:not(.yui3-default-hidden) span[data='requestStatus']:not(div.yui3-default-hidden span)",
      dispositionElement:
        "div:not(.yui3-default-hidden) span[data='disposition']:not(div.yui3-default-hidden span)",
      dueDateElement:
        'div:not(.yui3-default-hidden) span[data="returning.originalDueToSupplier"]:not(div.yui3-default-hidden span)',
      renewalDueDateElement:
        'div:not(.yui3-default-hidden) span[data="returning.dueToSupplier"]:not(div.yui3-default-hidden span)',
    },
  };

  const activeSelectors = isQueueUrl ? selectors.queue : selectors.direct;

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
    const applyEmphasisStyle = (el, backgroundColor, color = "white") => {
      console.log("applyEmphasisStyle", el);
      el.style.backgroundColor = backgroundColor;
      el.style.color = color;
      el.style.padding = "0.4rem";
      el.style.borderRadius = "0.5rem";
      el.style.fontWeight = "bold";
    };

    const highlightRequestStatus = async () => {
      // TODO: This variable works when it is the queue, but not when pulled up directly
      // const requestStatus = await waitForElementWithInterval(
      //   "#requests > div:not([class*='hidden']) span[data='requestStatus']"
      // );
      // const requestStatus = await waitForElementWithInterval(
      //   "div:not(.yui3-default-hidden) span[data='requestStatus']:not(div.yui3-default-hidden span)"
      // );
      const requestStatus = await waitForElementWithInterval(
        activeSelectors.requestStatus
      );
      console.log("requestStatus", requestStatus);
      if (!requestStatus) return;
      if (requestStatus.innerText.includes("Closed")) {
        applyEmphasisStyle(requestStatus, "black", "white");
        // TODO: This variable works when it is the queue, but not when pulled up directly
        // const requestHeader = document.querySelector(
        //   "#requests > div:not([class*='hidden']) .nd-request-header"
        // );
        // const requestHeader = document.querySelector(
        //   "div:not(.yui3-default-hidden) .nd-request-header:not(div.yui3-default-hidden .nd-request-header)"
        // );
        const requestHeader = await waitForElementWithInterval(
          activeSelectors.requestHeader
        );
        applyEmphasisStyle(requestHeader, "black", "white");
        return;
      }
      // If the request status is recalled, emphasize it
      if (
        requestStatus.innerText.includes("Recalled") ||
        requestStatus.innerText.includes("Missing")
      ) {
        applyEmphasisStyle(requestStatus, "red");
      }
      // If request is received, check for existence of 'Overdue' in the disposition element
      else if (requestStatus.innerText.includes("Received")) {
        // TODO: This variable works when it is the queue, but not when pulled up directly
        // const dispositionElement = document.querySelector(
        //   "#requests > div:not([class*='hidden']) span[data='disposition']"
        // );
        // const dispositionElement = document.querySelector(
        //   "div:not(.yui3-default-hidden) span[data='disposition']:not(div.yui3-default-hidden span)"
        // );
        const dispositionElement = await waitForElementWithInterval(
          activeSelectors.dispositionElement
        );
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
      // const dueDateElement = await waitForElementWithInterval(
      //   'div:not(.yui3-default-hidden) span[data="returning.originalDueToSupplier"]:not(div.yui3-default-hidden span)'
      // );
      const dueDateElement = await waitForElementWithInterval(
        activeSelectors.dueDateElement
      );
      try {
        if (!dueDateElement) return;
        // const renewalDueDateElement = document.querySelector(
        //   'div:not(.yui3-default-hidden) span[data="returning.dueToSupplier"]:not(div.yui3-default-hidden span)'
        // );
        console.log("dueDateElement", dueDateElement.textContent);
        const renewalDueDateElement = await waitForElementWithInterval(
          activeSelectors.renewalDueDateElement
        );
        // console.log("renewalDueDateElement", renewalDueDateElement.textContent);
        // If the renewal due date element exists, use it instead of the original due date element
        const dueDate = renewalDueDateElement
          ? renewalDueDateElement
          : dueDateElement;
        console.log("dueDate", dueDate.innerText);
        const diffDays = calculateTimeDiff(dueDate.innerText);
        console.log("diffDays", diffDays);
        // If due date is today or in the past, emphasize it
        if (diffDays <= 0) {
          console.log("Due date is today or in the past.");
          // TODO: This variable works when it is the queue, but not when pulled up directly
          // const requestStatus = await waitForElementWithInterval(
          //   "#requests > div:not([class*='hidden']) span[data='requestStatus']"
          // );
          // const requestStatus = await waitForElementWithInterval(
          //   "div:not(.yui3-default-hidden) span[data='requestStatus']:not(div.yui3-default-hidden span)"
          // );
          const requestStatus = await waitForElementWithInterval(
            activeSelectors.requestStatus
          );
          console.log("requestStatus from where it should be", requestStatus);
          // Don't highlight red if the request is returned
          if (requestStatus) {
            if (requestStatus.innerText.includes("Returned")) return;

            console.log("About to apply red style to due date");
            console.log("dueDate", dueDate);
            applyEmphasisStyle(dueDate, "red");
            // TODO: This variable works when it is the queue, but not when pulled up directly
            // const requestHeader = document.querySelector(
            //   "#requests > div:not([class*='hidden']) .nd-request-header"
            // );
            // const requestHeader = document.querySelector(
            //   "div:not(.yui3-default-hidden) .nd-request-header:not(div.yui3-default-hidden .nd-request-header)"
            // );
            const requestHeader = await waitForElementWithInterval(
              activeSelectors.requestHeader
            );
            // #requestSearchResults
            requestHeader.style.backgroundColor = "#f8d7da";
          }
        } else if (diffDays >= 21) {
          applyEmphasisStyle(dueDate, "green");
          //TODO: This variable works when it is the queue, but not when pulled up directly
          // const requestHeader = document.querySelector(
          //   "#requests > div:not([class*='hidden']) .nd-request-header"
          // );
          // const requestHeader = document.querySelector(
          //   "div:not(.yui3-default-hidden) .nd-request-header:not(div.yui3-default-hidden .nd-request-header)"
          // );
          const requestHeader = await waitForElementWithInterval(
            activeSelectors.requestHeader
          );
          applyEmphasisStyle(requestHeader, "#d4f0d4");
          // requestHeader.style.backgroundColor = "#d4f0d4";
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
    const observer = new MutationObserver(() => {
      if (window.location.href !== window.currentUrl) {
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
