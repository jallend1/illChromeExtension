if (!window.worldShareModsInjected) {
  // Sets a flag on the window object to prevent the script from running multiple times
  window.worldShareModsInjected = true;
  window.currentUrl = window.location.href;

  const determineSelectors = () => {
    // TODO: Selectors are not updating when the URL changes
    // Move that logic here and remove the function from the global scope
    // Call it in the monitorUrlChanges function
    // const isQueueUrl = window.currentUrl.includes("queue");
    // const selectors = {
    //   queue: {
    //     requestHeader:
    //       "#requests > div:not([class*='hidden']) .nd-request-header",
    //     requestStatus:
    //       "#requests > div:not([class*='hidden']) span[data='requestStatus']",
    //     dispositionElement:
    //       "#requests > div:not([class*='hidden']) span[data='disposition']",
    //     dueDateElement:
    //       '#requests > div:not([class*="hidden"]) span[data="returning.originalDueToSupplier"]',
    //     renewalDueDateElement:
    //       '#requests > div:not([class*="hidden"]) span[data="returning.dueToSupplier"]',
    //   },
    //   direct: {
    //     requestHeader:
    //       "div:not(.yui3-default-hidden) .nd-request-header:not(div.yui3-default-hidden .nd-request-header)",
    //     requestStatus:
    //       "div:not(.yui3-default-hidden) span[data='requestStatus']:not(div.yui3-default-hidden span)",
    //     dispositionElement:
    //       "div:not(.yui3-default-hidden) span[data='disposition']:not(div.yui3-default-hidden span)",
    //     dueDateElement:
    //       'div:not(.yui3-default-hidden) span[data="returning.originalDueToSupplier"]:not(div.yui3-default-hidden span)',
    //     renewalDueDateElement:
    //       'div:not(.yui3-default-hidden) span[data="returning.dueToSupplier"]:not(div.yui3-default-hidden span)',
    //   },
    // };
    // const activeSelectors = isQueueUrl ? selectors.queue : selectors.direct;
    // return activeSelectors;
  };

  // Check URL to see if it includes the word queue
  const isQueueUrl = window.currentUrl.includes("queue");
  const lendingSelectors = {
    queue: {
      borrowingNotes: `#requests > div:not([class*="hidden"]) span[data="requester.note"]`,
    },
    direct: {
      borrowingNotes: `div:not(.yui3-default-hidden) span[data="requester.note"]`,
    },
  };

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
      // }
    });

  const isLendingRequest = async () => {
    if (window.location.href.includes("lendingSubmittedLoan")) return true;
    const borrowingLibrary = await waitForElementWithInterval(
      "#requests > div:not([class*='hidden']) span.borrowingLibraryExtra"
    );
    if (!borrowingLibrary)
      console.log(
        "What page are we on when we're getting this borrowingLibrary error?"
      );

    console.log("isLending : " + !borrowingLibrary.textContent.includes("NTG"));
    // If borrowingLibrary does not include "NTG", it's a lending request
    return !borrowingLibrary.textContent.includes("NTG");
  };

  const runLendingMods = async () => {
    const borrowingNotes = await waitForElementWithInterval(
      lendingSelectors.direct.borrowingNotes
    );
    if (borrowingNotes) {
      applyEmphasisStyle(borrowingNotes, "#fff9c4", "black");
    }
  };

  const applyEmphasisStyle = (el, backgroundColor, color = "white") => {
    el.style.backgroundColor = backgroundColor;
    el.style.color = color;
    el.style.padding = "0.4rem";
    el.style.borderRadius = "0.5rem";
    el.style.fontWeight = "bold";
  };

  const runWorldShareMods = async () => {
    const elements = {
      requestHeader: await waitForElementWithInterval(
        activeSelectors.requestHeader
      ),
      requestStatus: await waitForElementWithInterval(
        activeSelectors.requestStatus
      ),
      dispositionElement: await waitForElementWithInterval(
        activeSelectors.dispositionElement
      ),
      dueDateElement: await waitForElementWithInterval(
        activeSelectors.dueDateElement
      ),
    };

    // renewalDueDateElement does not exist on all pages, but will exist if dueDateElement exists
    if (elements.dueDateElement) {
      elements.renewalDueDateElement = document.querySelector(
        activeSelectors.renewalDueDateElement
      );
    }
    const highlightRequestStatus = async () => {
      const { requestStatus, requestHeader, dispositionElement } = elements;
      if (!requestStatus) return;
      if (requestStatus.innerText.includes("Closed")) {
        applyEmphasisStyle(requestStatus, "black", "white");
        applyEmphasisStyle(requestHeader, "black", "white");
        return;
      }
      // If the request status is recalled, emphasize it
      if (
        requestStatus.innerText.includes("Recalled") ||
        requestStatus.innerText.includes("Missing")
      ) {
        applyEmphasisStyle(requestStatus, "red", "black");
      }
      // If request is received, check for existence of 'Overdue' in the disposition element
      else if (requestStatus.innerText.includes("Received")) {
        if (
          dispositionElement &&
          dispositionElement.innerText.includes("Overdue")
        ) {
          applyEmphasisStyle(dispositionElement, "red", "black");
        }
      }
    };

    const highlightDueDate = async () => {
      const {
        dueDateElement,
        renewalDueDateElement,
        requestStatus,
        requestHeader,
      } = elements;
      try {
        if (!dueDateElement) return;
        const dueDate = renewalDueDateElement
          ? renewalDueDateElement
          : dueDateElement;
        const diffDays = calculateTimeDiff(dueDate.innerText);
        if (
          requestStatus.innerText.includes("Returned") ||
          requestStatus.innerText.includes("Transit")
        )
          return;
        // If due date is today or in the past, emphasize it
        if (diffDays <= 0) {
          applyEmphasisStyle(dueDate, "red", "black");
          applyEmphasisStyle(requestHeader, "red", "black");
        } else if (diffDays >= 21) {
          applyEmphasisStyle(dueDate, "green");
          applyEmphasisStyle(requestHeader, "#d4f0d4", "black");
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

  const determineMods = async () => {
    const isLending = await isLendingRequest();
    console.log("Determine mods - isLending: " + isLending);

    if (isLending) {
      runLendingMods();
    } else {
      runWorldShareMods();
    }
  };

  const monitorUrlChanges = () => {
    const observer = new MutationObserver(() => {
      if (window.location.href !== window.currentUrl) {
        window.currentUrl = window.location.href; // Update the current URL
        if (isTargetUrl(window.currentUrl)) {
          determineSelectors();
          determineMods();
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("beforeunload", () => {
      observer.disconnect();
    });
  };

  // Runs the script initially when the page loads
  if (isTargetUrl(window.currentUrl)) determineMods();

  // Sets up a MutationObserver to monitor URL changes
  // and reruns the script when we got a new URL
  monitorUrlChanges();
}
