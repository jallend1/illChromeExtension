(async () => {
  console.log("Running retrievePatron.js...");

  const waitForElementWithInterval = (selector) =>
    new Promise((resolve, reject) => {
      const startTime = Date.now();

      const intervalId = setInterval(() => {
        const element = document.querySelector(selector);
        if (element) {
          clearInterval(intervalId); // Clears interval when we got the element
          resolve(element);
        } else if (Date.now() - startTime > 10000) {
          clearInterval(intervalId);
          reject(new Error(`Element with selector "${selector}" not found.`));
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
      console.log(result.patronBarcode);
      if (!result.patronBarcode)
        throw new Error("Patron ID not found in storage.");

      console.log(result.patronBarcode);
      inputField.value = result.patronBarcode;
      const event = new Event("input", { bubbles: true, cancelable: true });
      inputField.dispatchEvent(event);
      submitButton.click();
    });
  } catch (error) {
    console.error(error.message);
  }
})();
