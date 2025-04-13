(async () => {
  const waitForElementWithInterval = (selectorOrFunction) =>
    new Promise((resolve, reject) => {
      const startTime = Date.now();
      const intervalId = setInterval(() => {
        const element =
          typeof selectorOrFunction === "function"
            ? selectorOrFunction() // If a function, call it to get the element
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

  try {
    const inputField = await waitForElementWithInterval(
      "#barcode-search-input"
    );
    const submitButton = await waitForElementWithInterval(
      ".btn.btn-outline-secondary"
    );

    chrome.storage.local.get("patronBarcode", (result) => {
      if (!result.patronBarcode)
        throw new Error("Patron ID not found in storage.");
      inputField.value = result.patronBarcode;
      const event = new Event("input", { bubbles: true, cancelable: true });
      inputField.dispatchEvent(event);
      submitButton.click();
      goToBilling();
      clickAddBilling();
      chrome.storage.local.remove("patronBarcode");
    });
  } catch (error) {
    console.error(error.message);
  }

  const goToBilling = async () => {
    // Waits for link to billing tab to appear on patron page
    try {
      const billingLink = await waitForElementWithInterval(() => {
        return Array.from(document.querySelectorAll("a")).find((link) =>
          link.textContent.includes("Bills")
        );
      });
      billingLink.click();
    } catch (error) {
      console.error("Billing link not found:", error.message);
    }
  };

  const clickAddBilling = async () => {
    // Waits for button to add billing info to appear on billing tab page
    try {
      const addBillingButton = await waitForElementWithInterval(() => {
        return Array.from(document.querySelectorAll("button")).find((button) =>
          button.textContent.includes("Add Billing")
        );
      });
      addBillingButton.click();
    } catch (error) {
      console.error("Add Billing button not found:", error.message);
    }
  };
})();
