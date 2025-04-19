if (!window.worldShareModsInjected) {
  // Sets a flag on the window object to prevent the script from running multiple times
  window.worldShareModsInjected = true;
  window.currentUrl = window.location.href;

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
          reject(new Error(`Element not found.`));
        }
      }, 100);
    });

  const retrieveRequestsContainer = async () => {
    const requestsContainer = await waitForElementWithInterval("#requests");
    if (requestsContainer && !requestsContainer.dataset.observerAdded) {
      requestsContainer.dataset.observerAdded = true;
      requestsContainer.dataset.currentChildCount =
        requestsContainer.childElementCount;
      const config = { childList: true, subtree: true };

      const handleRequestsMutations = (mutationsList) => {
        for (const mutation of mutationsList) {
          if (
            mutation.type === "childList" &&
            mutation.target === requestsContainer
          ) {
            const newChildCount = mutation.target.childElementCount;
            const oldChildCount = requestsContainer.dataset.currentChildCount;
            if (newChildCount !== oldChildCount) {
              console.log("Child count changed.");
              requestsContainer.dataset.currentChildCount = newChildCount;
              // console.log(requestsContainer.childElementCount);
              // console.log("A child node has been added or removed.");
              runWorldShareMods();
            }
          }
        }
      };
      const observer = new MutationObserver(handleRequestsMutations);
      observer.observe(requestsContainer, config);
    }
    console.log(requestsContainer?.childElementCount);
  };

  retrieveRequestsContainer();

  const runWorldShareMods = async () => {
    console.log("Running WorldShare mods...");
    // retrieveRequestsContainer();
    const applyWarningStyles = (el) => {
      el.style.backgroundColor = "red";
      el.style.color = "white";
      el.style.padding = "0.4rem";
      el.style.borderRadius = "0.5rem";
      el.style.fontWeight = "bold";
    };

    const highlightRequestStatus = async () => {
      const requestStatus = await waitForElementWithInterval(
        "div:not(.yui3-default-hidden) span[data='requestStatus']"
      );
      // console.log(requestStatus.innerText);
      if (!requestStatus) {
        console.error("Request status not found.");
        return;
      }

      // If the request status is recalled, emphasize it
      if (requestStatus.innerText.includes("Recalled"))
        applyWarningStyles(requestStatus);
      else if (requestStatus.innerText.includes("Received")) {
        const dispositionElement = document.querySelector(
          "[data='disposition']"
        );
        if (
          dispositionElement &&
          dispositionElement.innerText.includes("Overdue")
        ) {
          applyWarningStyles(dispositionElement);
        }
      }
    };
    const highlightDueDate = async () => {
      const dueDateElement = await waitForElementWithInterval(
        'div:not(.yui3-default-hidden) span[data="returning.originalDueToSupplier"]'
      );
      // console.log(dueDateElement.innerText);
      try {
        if (!dueDateElement) {
          console.error("Due date element not found.");
          return;
        }
        const dueDate = new Date(dueDateElement.innerText);
        const today = new Date();
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
        // If due date is today or in the past, emphasize it
        if (diffDays <= 0) applyWarningStyles(dueDateElement);
        else if (diffDays >= 21) {
          dueDateElement.style.backgroundColor = "green";
          dueDateElement.style.color = "white";
          dueDateElement.style.padding = "0.4rem";
          dueDateElement.style.borderRadius = "0.5rem";
          dueDateElement.style.fontWeight = "bold";
        }
      } catch (error) {
        console.error("Error parsing due date:", error);
      }
    };

    // Checks if the current URL has a request number, versus any other WorldShare page
    const requestUrlRegEx = /(\d{8,10})/;

    if (window.currentUrl.match(requestUrlRegEx)) {
      highlightDueDate();
      highlightRequestStatus();
    }
  };

  const monitorUrlChanges = () => {
    const observer = new MutationObserver(() => {
      if (window.location.href !== window.currentUrl) {
        window.currentUrl = window.location.href; // Update the current URL
        runWorldShareMods();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  // runWorldShareMods();
  monitorUrlChanges();
}
