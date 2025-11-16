(async () => {
  if (!window.worldShareModsInjected) {
    const { packageFrequency } = await import(
      chrome.runtime.getURL("modules/packageFrequency.js")
    );

    const { borrowingSelectors, lendingSelectors } = await import(
      chrome.runtime.getURL("modules/constants.js")
    );

    const { createAddToBookshelfButton, doesLibraryAlreadyExist } =
      await import(chrome.runtime.getURL("modules/virtualBookShelf.js"));

    const {
      waitForElementWithInterval,
      createMiniModal,
      isLendingRequestPage,
    } = await import(chrome.runtime.getURL("modules/utils.js"));

    // Sets a flag on the window object to prevent the script from running multiple times
    window.worldShareModsInjected = true;
    window.currentUrl = window.location.href;

    // --- Utility Functions --
    /**
     * Calculates the difference in days between the due date and today.
     * @param {string} dueDateString - The due date as a string.
     * @returns {number} - The difference in days.
     */
    const calculateTimeDiff = (dueDateString) => {
      const dueDate = new Date(dueDateString);
      const today = new Date();
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
      return diffDays;
    };

    /**
     * Applies emphasis styles to a given element.
     * @param {HTMLElement} el - The element to style.
     * @param {string} backgroundColor - The background color to apply.
     * @param {string} color - The text color to apply.
     */
    const applyEmphasisStyle = (el, backgroundColor, color = "white") => {
      el.style.backgroundColor = backgroundColor;
      el.style.color = color;
      el.style.padding = "0.4rem";
      el.style.borderRadius = "0.5rem";
      el.style.fontWeight = "bold";
    };

    /**
     * Highlights the request status element based on its content.
     * @param {Object} elements - The elements to process.
     * @returns
     */
    const highlightRequestStatus = async (elements) => {
      // const { requestStatus, requestHeader } = elements;
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

    /**
     * Highlights the due date element based on its content.
     * @param {Object} elements - The elements to process.
     * @returns {Promise<void>}
     */
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

    /**
     * Runs the borrowing modifications.
     * @param {Object} activeSelectors - The active selectors to use.
     */
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
      // Only displays package frequency if request is in received/recalled status
      if (
        elements.requestStatus.innerText.includes("Received") ||
        elements.requestStatus.innerText.includes("Recalled")
      ) {
        packageFrequency();
      }
    };

    /**
     * Runs the lending modifications.
     * @param {Object} activeSelectors - The active selectors to use.
     */
    const runLendingMods = async (activeSelectors) => {
      const borrowingNotes = await waitForElementWithInterval(
        activeSelectors.borrowingNotes
      );
      if (borrowingNotes) {
        applyEmphasisStyle(borrowingNotes, "#fff9c4", "black");
      }
    };

    // --- Page Analysis Functions ---
    /**
     * Checks if the given URL is a request URL.
     * @param {string} url - The URL to check.
     * @returns {boolean} - True if the URL is a request URL, false otherwise.
     */
    const isRequestUrl = (url) => {
      // Return false if request is being updated in OCLC with URL parameters
      if (url.includes("?message")) return false;
      const requestUrlRegEx = /(\d{8,10})/;
      return url.match(requestUrlRegEx);
    };

    /**
     * Determines the active selectors based on the lending/borrowing context.
     * @param {boolean} isLending - True if the context is lending, false if borrowing.
     * @returns {Object} - The active selectors to use.
     */
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

    /**
     * Determines the modifications to apply based on the lending/borrowing context.
     * @returns {Promise<void>}
     */
    const determineMods = async () => {
      const isLending = await isLendingRequestPage();
      const activeSelectors = determineSelectors(isLending);
      if (isLending) {
        runLendingMods(activeSelectors);
      } else {
        runBorrowingMods(activeSelectors);
      }
    };

    /**
     * Monitors URL changes and triggers actions based on the new URL.
     * @returns {Promise<void>}
     */
    const monitorUrlChanges = async () => {
      const observer = new MutationObserver(async () => {
        if (window.location.href !== window.currentUrl) {
          window.currentUrl = window.location.href; // Update the current URL
          // Extracts the request number after submission
          if (
            window.currentUrl.includes(
              "/new?fulfillmentType=OCLC_ILL&role=REQUESTER"
            )
          ) {
            console.log("New request detected!!");
            const requestAnchorTag = await waitForElementWithInterval(
              ".wms-alert.wms-message-confirm > p.msg > a"
            );
            console.log("Message Container:", requestAnchorTag);
            navigator.clipboard.writeText(requestAnchorTag.textContent.trim());
            console.log("Text copied to clipboard.");
            console.log("Clicking request anchor tag...", requestAnchorTag);
            // TODO: Clicking anchor tag works as expected for the first couple requests, but then loads a blank request page
            // requestAnchorTag.click();
            createMiniModal(
              "Request ID ( " +
                requestAnchorTag.textContent.trim() +
                " ) copied to clipboard."
            );
            return;
          }
          if (isRequestUrl(window.currentUrl)) {
            createAddToBookshelfButton();
            // TODO: Seems to be executed under lending requests...That desirable?
            doesLibraryAlreadyExist();
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
    doesLibraryAlreadyExist();
    const libraryExists = await doesLibraryAlreadyExist();
    if (libraryExists) {
      createMiniModal(
        "Alert! This library has items on the virtual bookshelf!",
        true,
        10000
      );
    }

    // Sets up a MutationObserver to monitor URL changes
    // and reruns the script when we got a new URL
    monitorUrlChanges();
  }
})();
