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

    chrome.storage.local.get("request", (result) => {
      console.log(result);
      const { patronBarcode, title, fee } = result.request || {};
      console.log(patronBarcode, title, fee);
      if (!patronBarcode) throw new Error("Patron barcode not provided.");

      inputField.value = patronBarcode;
      const event = new Event("input", { bubbles: true, cancelable: true });
      inputField.dispatchEvent(event);
      submitButton.click();
      goToBillingTab();
      clickAddBilling();
      addBillingNotes(title, fee);
      chrome.storage.local.remove("request");
    });
  } catch (error) {
    console.error(error.message);
  }

  const goToBillingTab = async () => {
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

  const addBillingNotes = async (title, fee) => {
    // Waits for billing modal to appear and then fills out fee and title
    try {
      const billingModal = await waitForElementWithInterval(() => {
        return document.querySelector(".modal-content");
      });
      if (!billingModal) throw new Error("Billing modal not found.");
      
      const feeInput = billingModal.querySelector("#amount-input");
      const titleInput = billingModal.querySelector("textarea");

      feeInput.value = fee;
      titleInput.value = `Patron approved lending fee for "ILL Title - ${title}" sent out from ILL today.`;

      const submitButton = billingModal.querySelector(".btn.btn-success");
      submitButton.focus();
    } catch (error) {
      console.error("Billing modal not found:", error.message);
    }
  };
})();
