// Description: Inserts request data copied from WorldShare into Evergreen ILL form if it's detected in local storage

/**
 * Updates an input field's value and triggers an input event.
 * @param {string} selector - The CSS selector for the input field.
 * @param {*} value - The value to set for the input field.
 * @param {string} prefix - An optional prefix to prepend to the value.
 * @returns {void}
 */
export const updateInputField = (selector, value, prefix = "") => {
  const inputField = document.querySelector(selector);
  if (!inputField) {
    console.warn(`Input field not found for selector: ${selector}`);
    return;
  }
  inputField.value = prefix + value;
  const event = new Event("input", {
    bubbles: true,
    cancelable: true,
  });
  inputField.dispatchEvent(event);
};

/**
 * Inserts request data into the Evergreen ILL form.
 * @returns {Promise<void>}
 */
export async function insertRequestToEvergreen() {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );
  const { createILL } = await import(
    chrome.runtime.getURL("modules/constants.js")
  );

  // TODO: Patron name stored in localStorage but not used in this function yet
  // Use to 1) Verify patron name on Evergreen screen 2) Add patron pickup location
  /**
   * Inserts the request data into the Evergreen ILL form.
   */
  function pasteToEvergreen() {
    let heading = "Something went wrong!";
    let message =
      "Couldn't find the right spots to insert the request information. Make sure you're on the 'Create ILL Screen.' If the problems continue, contact Jason.";
    const imgURL = chrome.runtime.getURL("images/kawaii-book-sad.png");
    const headerColor = "#e85e6a";

    /**
     * Updates the patron address input field with the provided address string.
     * @param {string} addressString - The address string to insert into the input field.
     * @returns {void}
     */
    const updatePatronAddress = (addressString) => {
      const inputField = document.querySelector("textarea");
      if (!inputField) {
        statusModal(heading, message, headerColor, imgURL);
        return;
      }
      if (inputField.value.includes(createILL.SPECIAL_TEXT.BAG)) {
        addressString = createILL.SPECIAL_TEXT.BAG + addressString;
      }
      if (inputField.value.includes(createILL.SPECIAL_TEXT.BOX)) {
        addressString = createILL.SPECIAL_TEXT.BOX + addressString;
      }
      updateInputField("textarea", addressString);
    };

    const extractArrayFromLocalStorage = () => {
      chrome.storage.local.get("requestData", (result) => {
        if (!result.requestData) {
          // TODO: Something less obtrusive than the statusModal?
          // TODO: Default behavior shouldn't be met with annoyances, even though I'm not sure when it would ever need to occur
          // result = `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">No stored request data found.</h2> <p style="font-size: 1rem;">Couldn't find any data to insert onto the page.</p>`;
          // statusModal(result, headerColor, imgURL);
          return;
        } else {
          const {
            addressString,
            requestNumber,
            title,
            patronID,
            isLendingFee,
          } = JSON.parse(result.requestData);
          updateInputField(
            createILL.SELECTORS.TITLE_INPUT,
            title,
            "ILL Title - "
          );
          updateInputField(
            createILL.SELECTORS.CALLNUMBER_INPUT,
            requestNumber,
            "IL"
          );
          updateInputField(createILL.SELECTORS.PATRON_BARCODE_INPUT, patronID);
          updatePatronAddress(addressString);

          // Moves focus to barcode input field
          const barcodeInputField = document.querySelector(
            createILL.SELECTORS.ITEM_BARCODE_INPUT
          );
          if (barcodeInputField) {
            barcodeInputField.focus();
          }
        }
      });
    };

    extractArrayFromLocalStorage();
  }
  pasteToEvergreen(statusModal);
}
