(async () => {
  // Same function as in retrievePatron.js
  const waitForElementWithInterval = (selectorOrFunction) =>
    new Promise((resolve, reject) => {
      const startTime = Date.now();
      const intervalId = setInterval(() => {
        const element =
          typeof selectorOrFunction === "function"
            ? selectorOrFunction() // If a function, invoke it to get the element (Not necessary in this file...yet)
            : document.querySelector(selectorOrFunction); // If a selector, go to town

        if (element) {
          clearInterval(intervalId); // Clears interval when element is found
          resolve(element);
        } else if (Date.now() - startTime > 10000) {
          clearInterval(intervalId);
          reject(new Error(`Element not found.`));
        }
      }, 100);
    });

  const applyWarningStyles = (el) => {
    el.style.backgroundColor = "red";
    el.style.color = "white";
    el.style.padding = "0.4rem";
    el.style.borderRadius = "0.5rem";
    el.style.fontWeight = "bold";
  };

  const highlightRequestStatus = async () => {
    const requestStatus = await waitForElementWithInterval(
      "[data='requestStatus']"
    );
    if (!requestStatus) {
      console.error("Request status not found.");
      return;
    }
  
    // If the request status is recalled, emphasize it
    if (requestStatus.innerText.includes("Recalled")) applyWarningStyles(requestStatus);
    else if (requestStatus.innerText.includes("Received")) {
      const dispositionElement = document.querySelector("[data='disposition']");
      if (
        dispositionElement &&
        dispositionElement.innerText.includes("Overdue")
      ) {
        applyWarningStyles(dispositionElement);
      }
    }
  }

  const highlightDueDate = async () => {
    const dueDateElement = await waitForElementWithInterval('[data="returning.originalDueToSupplier"]');
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
      if (diffDays <= 0) {
        console.log('Due date is today or in the past, applying warning styles...');
        applyWarningStyles(dueDateElement);
      }

      else if (diffDays >= 21) {
        console.log('Due date is more than 21 days away, applying green styles...');
        dueDateElement.style.backgroundColor = "green";
        dueDateElement.style.color = "white";
        dueDateElement.style.padding = "0.4rem";
        dueDateElement.style.borderRadius = "0.5rem";
        dueDateElement.style.fontWeight = "bold";
      }
    }
     catch (error) {
      console.error("Error parsing due date:", error);
    }
  }

  highlightRequestStatus();
  highlightDueDate();

})();
