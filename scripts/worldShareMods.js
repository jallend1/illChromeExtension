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

    const { waitForElementWithInterval, isLendingRequestPage } = await import(
      chrome.runtime.getURL("modules/utils.js")
    );

    const { createMiniModal } = await import(
      chrome.runtime.getURL("modules/modals.js")
    );

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
        applyEmphasisStyle(requestStatus, "#fde8e8", "#991b1b");
      }
      // If request is received, check for existence of 'Overdue' in the disposition element
      else if (requestStatus.innerText.includes("Received")) {
        if (
          dispositionElement &&
          dispositionElement.innerText.includes("Overdue")
        ) {
          applyEmphasisStyle(dispositionElement, "#fde8e8", "#991b1b");
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
          applyEmphasisStyle(dueDate, "#fff3cd", "#856404");
          applyEmphasisStyle(requestHeader, "#fff3cd", "#856404");
        } else if (diffDays >= 21) {
          applyEmphasisStyle(dueDate, "green");
          applyEmphasisStyle(requestHeader, "#d4f0d4", "black");
        }
      } catch (error) {
        console.error("Error parsing due date:", error);
      }
    };

    /**
     * Injects a button into the action bar before the request data actions element.
     */
    const injectActionButton = async () => {
      const actionsEl = await waitForElementWithInterval(
        ".nd-request-action-bar-request-data-actions",
      );
      if (
        !actionsEl ||
        actionsEl.parentElement.querySelector("#ill-action-button")
      )
        return;

      const button = document.createElement("button");
      button.id = "ill-action-button";
      button.textContent = "Retrieve Patron";
      button.style.cssText =
        "background-color:#00b894;color:#fff;border:none;border-radius:0.3rem;padding:0.6rem 1.2rem;cursor:pointer;font-weight:400;margin-right:0.5rem;" +
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:1rem;line-height:1.5;letter-spacing:normal;text-transform:none;text-shadow:none;filter:none;-webkit-font-smoothing:antialiased;";

      button.addEventListener("click", () => {
        const patronInput = document.querySelector(
          `[data="requester.patron.userId"]`,
        );
        if (!patronInput?.value) return;
        chrome.storage.local.set({ patronToEdit: patronInput.value }, () => {
          chrome.runtime.sendMessage({
            action: "editPatron",
            patronBarcode: patronInput.value,
          });
        });
      });

      actionsEl.parentElement.insertBefore(button, actionsEl);
    };

    /**
     * Runs the borrowing modifications.
     * @param {Object} activeSelectors - The active selectors to use.
     */
    const runBorrowingMods = async (activeSelectors) => {
      const elements = {
        requestHeader: await waitForElementWithInterval(
          activeSelectors.requestHeader,
        ),
        requestStatus: await waitForElementWithInterval(
          activeSelectors.requestStatus,
        ),
        dispositionElement: await waitForElementWithInterval(
          activeSelectors.dispositionElement,
        ),
        dueDateElement: await waitForElementWithInterval(
          activeSelectors.dueDateElement,
        ),
      };

      // renewalDueDateElement does not exist on all pages, but will exist if dueDateElement exists
      if (elements.dueDateElement) {
        elements.renewalDueDateElement = document.querySelector(
          activeSelectors.renewalDueDateElement,
        );
      }

      await highlightDueDate(elements);
      await highlightRequestStatus(elements);
      await injectActionButton();
      // Only displays package frequency if request is in received/recalled status
      if (
        elements.requestStatus?.innerText.includes("Received") ||
        elements.requestStatus?.innerText.includes("Recalled")
      ) {
        packageFrequency();
      }
    };

    /**
     * Injects a "Retrieve Patron" button into every lending request action bar under #requests.
     */
    const injectLendingActionButton = async () => {
      await waitForElementWithInterval("#requests .nd-request-action-bar-request-data-actions");

      const requestsContainer = document.querySelector("#requests");
      if (!requestsContainer) return;

      requestsContainer.querySelectorAll(".nd-request-action-bar-request-data-actions").forEach((actionsEl) => {
        if (actionsEl.parentElement.querySelector(".ill-lending-action-button")) return;

        const button = document.createElement("button");
        button.className = "ill-lending-action-button";
        button.textContent = "Retrieve Patron";
        button.style.cssText =
          "background-color:#00b894;color:#fff;border:none;border-radius:0.3rem;padding:0.6rem 1.2rem;cursor:pointer;font-weight:400;margin-right:0.5rem;" +
          "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:1rem;line-height:1.5;letter-spacing:normal;text-transform:none;text-shadow:none;filter:none;-webkit-font-smoothing:antialiased;";

        button.addEventListener("click", () => {
          const request = actionsEl.closest("#requests > div");
          const postalSpan = request?.querySelector('[data="delivery.address.postal"]');
          const postalCode = postalSpan?.textContent?.trim();
          if (!postalCode) return;
          chrome.runtime.sendMessage({ type: "librarySearch", postalCode });
        });

        actionsEl.parentElement.insertBefore(button, actionsEl);
      });
    };

    /**
     * Runs the lending modifications.
     * @param {Object} activeSelectors - The active selectors to use.
     */
    const runLendingMods = async (activeSelectors) => {
      const borrowingNotes = await waitForElementWithInterval(
        activeSelectors.borrowingNotes,
      );
      if (borrowingNotes) {
        applyEmphasisStyle(borrowingNotes, "#fff9c4", "black");
      }
      injectLendingActionButton();
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
     * Highlights table records containing a digital item icon.
     */
    const highlightDigitalItems = () => {
      const highlight = () => {
        document.querySelectorAll(".uic-txt-ico.uic-ico-it-book-digital").forEach((span) => {
          const record = span.closest(".uic-table-record-data");
          if (record) record.style.backgroundColor = "#fffde7";
        });
      };

      highlight();

      const observer = new MutationObserver(highlight);
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 5000);
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
      highlightDigitalItems();
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
              "/new?fulfillmentType=OCLC_ILL&role=REQUESTER",
            )
          ) {
            const addToPrintQueue = async () => {
              // Poll until a visible print_now button exists (page fully rendered)
              const printNowBtn = await new Promise((resolve) => {
                const interval = setInterval(() => {
                  const visible = Array.from(document.querySelectorAll('button[data-action="print_now"]'))
                    .find((btn) => btn.offsetParent !== null);
                  if (visible) {
                    clearInterval(interval);
                    resolve(visible);
                  }
                }, 200);
              });

              const btnGroup = printNowBtn.closest(".btn-group");
              const printQueueAnchor = btnGroup.querySelector('li[data-action="add_to_print_queue"] a');
              if (!printQueueAnchor) {
                console.error("Could not find add_to_print_queue anchor in btn-group");
                return;
              }
              printQueueAnchor.click();
            };

            const handleAnchorClick = async (anchorTag) => {
              const requestId = anchorTag.textContent.trim();
              const href = anchorTag.href;
              window.lastClickedRequestHref = href;
              navigator.clipboard.writeText(requestId);
              // Defer the click to let WorldShare finish its own SPA navigation before we trigger another
              setTimeout(() => {
                anchorTag.click();
              }, 500);
              await addToPrintQueue();
              createMiniModal(`Request ID ( ${requestId} ) copied to clipboard.`);
              chrome.runtime.sendMessage({ type: "findAndSwitchToRequestManager", illNumber: requestId });
            };

            const preExisting = document.querySelector(
              ".wms-alert.wms-message-confirm > p.msg > a",
            );
            const isTrulyStale = preExisting && preExisting.href === window.lastClickedRequestHref;

            // If a fresh anchor is already in the DOM (WorldShare showed success before URL changed), click it now
            if (preExisting && !isTrulyStale) {
              handleAnchorClick(preExisting);
              return;
            }

            // If a truly stale anchor exists, wait for it to be replaced
            if (isTrulyStale) {
              await new Promise((resolve) => {
                const bodyObserver = new MutationObserver(() => {
                  const fresh = document.querySelector(".wms-alert.wms-message-confirm > p.msg > a");
                  // A fresh anchor has appeared that isn't the stale one
                  if (fresh && fresh.href !== window.lastClickedRequestHref) {
                    bodyObserver.disconnect();
                    handleAnchorClick(fresh);
                    resolve();
                  }
                });
                bodyObserver.observe(document.body, { childList: true, subtree: true });
              });
              return;
            }

            // No anchor in DOM yet — wait for it to appear
            const requestAnchorTag = await waitForElementWithInterval(
              ".wms-alert.wms-message-confirm > p.msg > a",
            );

            if (!requestAnchorTag || !requestAnchorTag.isConnected) {
              console.error("Could not find valid request anchor tag");
              return;
            }

            handleAnchorClick(requestAnchorTag);
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
        10000,
      );
    }

    // Sets up a MutationObserver to monitor URL changes
    // and reruns the script when we got a new URL
    monitorUrlChanges();
  }
})();
