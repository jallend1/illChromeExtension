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

  const applyStyles = (el) => {
    el.style.backgroundColor = "red";
    el.style.color = "white";
    el.style.padding = "0.4rem";
    el.style.borderRadius = "0.5rem";
    el.style.fontWeight = "bold";
  };

  const requestStatus = await waitForElementWithInterval(
    "[data='requestStatus']"
  );
  if (!requestStatus) {
    console.error("Request status not found.");
    return;
  }

  // If the request status is recalled, emphasize it
  if (requestStatus.innerText.includes("Recalled")) applyStyles(requestStatus);
  else if (requestStatus.innerText.includes("Received")) {
    const dispositionElement = document.querySelector("[data='disposition']");
    if (
      dispositionElement &&
      dispositionElement.innerText.includes("Overdue")
    ) {
      applyStyles(dispositionElement);
    }
  }
})();
