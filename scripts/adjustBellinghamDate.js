(async () => {
  const { waitForElementWithInterval, createMiniModal } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  const SELECTORS = {
    DROPDOWN_TOGGLE: "button.dropdown-toggle",
    DATE_OPTIONS: "button.dropdown-item > span.pl-2",
    DATE_INPUT: "input[type='date']",
    BARCODE_INPUT: "#barcode-input",
  };

  /**
   * Finds an element by text content within a collection
   * @param {NodeList} elements - The collection of elements to search
   * @param {string} text - The text content to match
   * @returns {Element|null} The matching element or null if not found
   */
  const findElementByText = (elements, text) => {
    return Array.from(elements).find((element) =>
      element.textContent.includes(text)
    );
  };

  /**
   * Calculates the due date as 10 weeks from now in the format YYYY-MM-DD
   * @returns {string} Formatted due date string
   * @example
   * // Returns "2025-10-12" if today is 2025-08-03
   * const dueDate = compileDueDate();
   */
  const compileDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 70);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  /**
   * Clicks the Date Options dropdown to reveal due date options
   * @async
   * @returns {Promise<void>}
   */
  const clickDueDateOptions = async () => {
    const dropDownButtons = await waitForElementWithInterval(() =>
      document.querySelectorAll(SELECTORS.DROPDOWN_TOGGLE)
    );
    const dateOptionsButton = findElementByText(
      dropDownButtons,
      "Date Options"
    );
    if (dateOptionsButton) {
      dateOptionsButton.click();
    }
  };

  /**
   * Clicks the Specific Due Date option in the Date Options dropdown
   * @async
   * @returns {Promise<void>}
   */
  const clickSpecificDueDate = async () => {
    const dateOptions = await waitForElementWithInterval(() =>
      document.querySelectorAll(SELECTORS.DATE_OPTIONS)
    );
    const specificDueDate = findElementByText(dateOptions, "Specific Due Date");
    if (specificDueDate) {
      specificDueDate.click();
    }
  };

  /**
   * Sets the due date input field to 10 weeks from now
   * This function waits for the date input field to be available,
   * formats the date as YYYY-MM-DD, and sets the value.
   * It also dispatches a change event to ensure Evergreen recognizes the update.
   * @async
   * @returns {Promise<void>}
   */
  const setDueDate = async () => {
    const dateInput = await waitForElementWithInterval(() =>
      document.querySelector(SELECTORS.DATE_INPUT)
    );
    if (dateInput) {
      const formattedDate = compileDueDate();
      dateInput.value = formattedDate;
      dateInput.dispatchEvent(
        new Event("change", { bubbles: true, cancelable: true })
      );
    }
  };

  /**
   * Focuses the barcode input field
   * After setting the due date, this function refocuses on the barcode input field
   * to allow for immediate scanning.
   * @async
   * @returns {Promise<void>}
   */
  const focusBarcodeInput = async () => {
    const barcodeInput = await waitForElementWithInterval(() =>
      document.querySelector(SELECTORS.BARCODE_INPUT)
    );
    if (barcodeInput) {
      barcodeInput.focus(); // Focus on the input field
    }
  };

  createMiniModal("Setting due date to 10 weeks from now.");
  clickDueDateOptions();
  clickSpecificDueDate();
  setDueDate();
  focusBarcodeInput();
})();
