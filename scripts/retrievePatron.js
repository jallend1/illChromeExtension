const { waitForElementWithInterval } = await import(
  chrome.runtime.getURL("modules/utils.js")
);

/**
 * Populates the patron barcode input field and submits the form.
 * @param {HTMLInputElement} inputField
 * @param {Element} submitButton
 * @param {string} patronBarcode
 */
export const populatePatronBarcode = (inputField, submitButton, patronBarcode) => {
  inputField.value = patronBarcode;
  const event = new Event("input", { bubbles: true, cancelable: true });
  inputField.dispatchEvent(event);
  submitButton.click();
};

/**
 * Gets the input field and submit button from the patron search page.
 * @returns {Promise<{inputField: HTMLInputElement, submitButton: Element}>}
 */
export const getPatronSearchElements = async () => {
  const inputField = await waitForElementWithInterval(
    "#barcode-search-input"
  );
  const submitButton = await waitForElementWithInterval(
    ".btn.btn-outline-secondary"
  );
  return { inputField, submitButton };
};

(async () => {
  const { addLendingFee } = await import(
    chrome.runtime.getURL("modules/addLendingFee.js")
  );

  try {
    const { inputField, submitButton } = await getPatronSearchElements();

    chrome.storage.local.get(["patronToEdit", "request"], (result) => {
      if (result.patronToEdit) {
        // Editing Patron
        const { patronToEdit } = result;
        populatePatronBarcode(inputField, submitButton, patronToEdit);
        chrome.storage.local.remove("patronToEdit");
      } else if (result.request) {
        // Otherwise, handle fee
        // TODO: Provide some clarity to the user that the fee is being added
        addLendingFee(result.request);
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
