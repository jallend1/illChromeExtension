// TODO: Expand to adjust due date to 10 weeks for all of Alaska libraries
(async () => {
  // If the URL does not include "/checkout", exit the script
  if (!window.location.href.includes("/checkout")) {
    console.log("Tried running on a non-checkout page, exiting script.");
    return;
  }
  const { waitForElementWithInterval, createMiniModal } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );
  const { DUEDATESELECTORS } = await import(
    chrome.runtime.getURL("modules/constants.js")
  );

  const CONFIG = {
    DUE_DATE_WEEKS: 10,
    DUE_DATE_DAYS: 70,
    NOTIFICATION_MESSAGE: "Setting due date to 10 weeks from now.",
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
   * Returns "2025-10-12" if today is 2025-08-03
   */
  const compileDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + CONFIG.DUE_DATE_DAYS);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  /**
   * Clicks the Date Options dropdown to reveal due date options
   * @async
   * @returns {Promise<boolean>} True if successful, false otherwise
   * @throws Will log an error if the dropdown cannot be clicked
   */
  const clickDueDateOptions = async () => {
    try {
      const dropDownButtons = await waitForElementWithInterval(() =>
        document.querySelectorAll(DUEDATESELECTORS.DROPDOWN_TOGGLE)
      );
      const dateOptionsButton = findElementByText(
        dropDownButtons,
        "Date Options"
      );
      if (!dateOptionsButton) {
        console.warn("Unable to locate Date Options button");
        return false;
      }
      dateOptionsButton.click();
      return true;
    } catch (error) {
      console.error("Error clicking date options:", error);
      return false;
    }
  };

  /**
   * Clicks the Specific Due Date option in the Date Options dropdown
   * @async
   * @returns {Promise<boolean>} True if successful, false otherwise
   * @throws Will log an error if the specific due date option cannot be clicked
   */
  const clickSpecificDueDate = async () => {
    try {
      const dateOptions = await waitForElementWithInterval(() =>
        document.querySelectorAll(DUEDATESELECTORS.DATE_OPTIONS)
      );
      const specificDueDate = findElementByText(
        dateOptions,
        "Specific Due Date"
      );

      if (!specificDueDate) {
        console.warn("Unable to locate Specific Due Date option");
        return false;
      }
      specificDueDate.click();
      return true;
    } catch (error) {
      console.error("Error clicking specific due date:", error);
      return false;
    }
  };

  /**
   * Sets the due date input field to 10 weeks from now
   * This function waits for the date input field to be available,
   * formats the date as YYYY-MM-DD, and sets the value.
   * It also dispatches a change event to ensure Evergreen recognizes the update.
   * @async
   * @returns {Promise<boolean>} True if successful, false otherwise
   * @throws Will log an error if the date input field cannot be located
   */
  const setDueDate = async () => {
    try {
      const dateInput = await waitForElementWithInterval(() =>
        document.querySelector(DUEDATESELECTORS.DATE_INPUT)
      );
      if (!dateInput) {
        console.warn("Unable to locate date input field");
        return false;
      }
      const formattedDate = compileDueDate();
      dateInput.value = formattedDate;
      dateInput.dispatchEvent(
        new Event("change", { bubbles: true, cancelable: true })
      );
      return true;
    } catch (error) {
      console.error("Error setting due date:", error);
      return false;
    }
  };

  /**
   * Focuses the barcode input field
   * After setting the due date, this function refocuses on the barcode input field
   * to allow for immediate scanning.
   * @async
   * @returns {Promise<boolean>} True if successful, false otherwise
   * @throws Will log an error if the barcode input field cannot be located
   */
  const focusBarcodeInput = async () => {
    try {
      const barcodeInput = await waitForElementWithInterval(() =>
        document.querySelector(DUEDATESELECTORS.BARCODE_INPUT)
      );
      if (!barcodeInput) {
        console.warn("Unable to locate barcode input field");
        return false;
      }

      barcodeInput.focus(); // Focus on the input field
      return true;
    } catch (error) {
      console.error("Error focusing barcode input:", error);
      return false;
    }
  };

  // Main execution flow
  try {
    createMiniModal(CONFIG.NOTIFICATION_MESSAGE);
    const isDateOptionsClicked = await clickDueDateOptions();
    if (!isDateOptionsClicked) {
      throw new Error("Failed to click date options");
    }

    const isSpecificDueDateClicked = await clickSpecificDueDate();
    if (!isSpecificDueDateClicked) {
      throw new Error("Failed to click specific due date");
    }

    const isDueDateSet = await setDueDate();
    if (!isDueDateSet) {
      throw new Error("Failed to set due date");
    }

    const isDateOptionsClickedAgain = await clickDueDateOptions();
    if (!isDateOptionsClickedAgain) {
      throw new Error("Failed to click date options again");
    }

    const isBarcodeInputFocused = await focusBarcodeInput();
    if (!isBarcodeInputFocused) {
      throw new Error("Failed to focus barcode input");
    }
  } catch (error) {
    console.error("Error in main execution flow:", error);
  }
})();
