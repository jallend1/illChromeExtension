if (!window.worldShareModsInjected) {
  // Sets a flag on the window object to prevent the script from running multiple times
  window.worldShareModsInjected = true;
  window.currentUrl = window.location.href;

  const runWorldShareMods = async () => {
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
    console.log(requestStatus.innerText);
    if (!requestStatus) {
      console.error("Request status not found.");
      return;
    }

    // If the request status is recalled, emphasize it
    if (requestStatus.innerText.includes("Recalled"))
      applyStyles(requestStatus);
    else if (requestStatus.innerText.includes("Received")) {
      const dispositionElement = document.querySelector("[data='disposition']");
      if (
        dispositionElement &&
        dispositionElement.innerText.includes("Overdue")
      ) {
        applyStyles(dispositionElement);
        applyStyles(requestStatus);
      }
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

  runWorldShareMods();
  monitorUrlChanges();
}
