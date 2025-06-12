(async () => {
  if (!window.worldShareModsInjected) {
    const { packageFrequency } = await import(
      chrome.runtime.getURL("modules/packageFrequency.js")
    );

    const { waitForElementWithInterval, buttonStyles, hoverStyles } =
      await import(chrome.runtime.getURL("modules/utils.js"));
    // Sets a flag on the window object to prevent the script from running multiple times
    window.worldShareModsInjected = true;
    window.currentUrl = window.location.href;

    // --- Selectors ---
    const borrowingSelectors = {
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
    const lendingSelectors = {
      queue: {
        borrowingNotes: `#requests > div:not([class*="hidden"]) span[data="requester.note"]`,
      },
      direct: {
        borrowingNotes: `div:not(.yui3-default-hidden) span[data="requester.note"]`,
      },
    };

    // TODO: Update selectors to account for multiple open requests
    const borrowingAddressSelectors = {
      attention: 'input[data="returning.address.attention"]',
      line1: 'input[data="returning.address.line1"]',
      line2: 'input[data="returning.address.line2"]',
      locality: 'input[data="returning.address.locality"]',
      region: 'span[data="returning.address.region"]',
      postal: 'input[data="returning.address.postal"]',
    };

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

    // -- Virtual Bookshelf Logic --
    const createAddToBookshelfButton = async () => {
      console.log("Creating Add to Virtual Bookshelf button");
      const parentElement = await waitForElementWithInterval(
        "#sidebar-nd > div"
      );
      if (!document.querySelector("#add-to-bookshelf-button")) {
        const button = document.createElement("button");
        button.innerText = "Add to Virtual Bookshelf";
        button.id = "add-to-bookshelf-button";
        Object.assign(button.style, buttonStyles);
        button.style.fontSize = "1rem";
        button.addEventListener("mouseover", () => {
          Object.assign(button.style, hoverStyles);
          button.style.fontSize = "1rem";
        });
        button.addEventListener("mouseout", () => {
          Object.assign(button.style, buttonStyles);
          button.style.fontSize = "1rem";
        });
        button.addEventListener("click", () => {
          console.log("Here we are, bois!!!");
          virtualBookShelfClick();
        });
        parentElement.appendChild(button);
      }
    };

    // Extract borrowing address elements
    const extractBorrowingAddressElements = async () => {
      const elements = {};
      for (const [key, selector] of Object.entries(borrowingAddressSelectors)) {
        elements[key] = await waitForElementWithInterval(selector);
      }
      return elements;
    };

    const virtualBookShelfClick = async () => {
      console.log("Virtual Bookshelf button clicked");
      const borrowingAddressElements = await extractBorrowingAddressElements();
      const addressData = {
        attention: borrowingAddressElements.attention.value,
        line1: borrowingAddressElements.line1.value,
        line2: borrowingAddressElements.line2.value,
        locality: borrowingAddressElements.locality.value,
        region: borrowingAddressElements.region.textContent.trim(),
        postal: borrowingAddressElements.postal.value,
      };
      console.log("Borrowing Address Data:", addressData);
      // TODO: Extract title and due data
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
