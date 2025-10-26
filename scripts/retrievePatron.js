(async () => {
  const { waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );
  const { addLendingFee } = await import(
    chrome.runtime.getURL("modules/addLendingFee.js")
  );

  try {
    const inputField = await waitForElementWithInterval(
      "#barcode-search-input"
    );
    const submitButton = await waitForElementWithInterval(
      ".btn.btn-outline-secondary"
    );

    chrome.storage.local.get(["patronToEdit", "request"], (result) => {
      if (result.patronToEdit) {
        // Editing Patron
        const { patronToEdit } = result;
        inputField.value = patronToEdit;
        const event = new Event("input", { bubbles: true, cancelable: true });
        inputField.dispatchEvent(event);
        submitButton.click();
        chrome.storage.local.remove("patronToEdit");
      } else if (result.request) {
        // Otherwise, handle fee
        // TODO: Provide some clarity to the user that the fee is being added
        addLendingFee(inputField, submitButton, result.request);
        chrome.storage.local.remove("request");
        return;
      } else {
        console.error("No valid data found in local storage.");
      }
    });
  } catch (error) {
    console.error(error.message);
  }
})();
