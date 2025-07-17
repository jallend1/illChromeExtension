(async () => {
  if (!window.worldShareModsInjected) {
    const { packageFrequency } = await import(
      chrome.runtime.getURL("modules/packageFrequency.js")
    );

    const { borrowingSelectors, lendingSelectors } = await import(
      chrome.runtime.getURL("modules/constants.js")
    );

    const { createAddToBookshelfButton } = await import(
      chrome.runtime.getURL("modules/virtualBookShelf.js")
    );

    const { waitForElementWithInterval } = await import(
      chrome.runtime.getURL("modules/utils.js")
    );

    // Sets a flag on the window object to prevent the script from running multiple times
    window.worldShareModsInjected = true;
    window.currentUrl = window.location.href;

    // --- Utility Functions --
    const calculateTimeDiff = (dueDateString) => {
      const dueDate = new Date(dueDateString);
      const today = new Date();
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
      return diffDays;
    };

    // --- Style WorldShare Fields ---
    const applyEmphasisStyle = (el, backgroundColor, color = "white") => {
      el.style.backgroundColor = backgroundColor;
      el.style.color = color;
      el.style.padding = "0.4rem";
      el.style.borderRadius = "0.5rem";
      el.style.fontWeight = "bold";
    };

    // --- Borrowing Mod Functions ---
    const highlightRequestStatus = async (elements) => {
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

    const highlightDueDate = async (elements) => {
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

    const runBorrowingMods = async (activeSelectors) => {
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

      await highlightDueDate(elements);
      await highlightRequestStatus(elements);
      packageFrequency();
    };

    // --- Lending Mod Functions ---
    const runLendingMods = async (activeSelectors) => {
      const borrowingNotes = await waitForElementWithInterval(
        activeSelectors.borrowingNotes
      );
      if (borrowingNotes) {
        applyEmphasisStyle(borrowingNotes, "#fff9c4", "black");
      }
    };

    // --- Page Analysis Functions ---
    const isRequestUrl = (url) => {
      // Return false if request is being updated in OCLC with URL parameters
      if (url.includes("?message")) return false;
      const requestUrlRegEx = /(\d{8,10})/;
      return url.match(requestUrlRegEx);
    };

    const determineSelectors = (isLending) => {
      const isQueueUrl = window.currentUrl.includes("queue");
      if (isLending) {
        const activeSelectors = isQueueUrl
          ? lendingSelectors.queue
          : lendingSelectors.direct;
        return activeSelectors;
      } else {
        const activeSelectors = isQueueUrl
          ? borrowingSelectors.queue
          : borrowingSelectors.direct;
        return activeSelectors;
      }
    };

    const isLendingRequestPage = async () => {
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
      return !borrowingLibrary.textContent.includes("NTG");
    };

    const determineMods = async () => {
      const isLending = await isLendingRequestPage();
      const activeSelectors = determineSelectors(isLending);
      if (isLending) {
        runLendingMods(activeSelectors);
      } else {
        runBorrowingMods(activeSelectors);
      }
    };

    // --- URL Change Monitoring ---
    const monitorUrlChanges = () => {
      const observer = new MutationObserver(() => {
        if (window.location.href !== window.currentUrl) {
          window.currentUrl = window.location.href; // Update the current URL
          if (isRequestUrl(window.currentUrl)) {
            createAddToBookshelfButton();
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
    if (isRequestUrl(window.currentUrl)) determineMods();
    createAddToBookshelfButton();

    // Sets up a MutationObserver to monitor URL changes
    // and reruns the script when we got a new URL
    monitorUrlChanges();
  }
})();

// TODO:
// 1) Monitor URL changes for create new request page
// 2) Once on create new request page, fire a function once the page is left
// 3) Search for a div with a class of "nd-request-container-messages yui3-wms-messages-content" (That is not hidden!)
// 4) If found, log the text content of that div
// 5) Copy it to the clipboard?
// 6) Auto add to print queue?
