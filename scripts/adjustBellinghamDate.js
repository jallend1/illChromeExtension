(async () => {
  const { waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  const SELECTORS = {
    DROPDOWN_TOGGLE: "button.dropdown-toggle",
    DATE_OPTIONS: "button.dropdown-item > span.pl-2",
    DATE_INPUT: "input[type='date']",
    BARCODE_INPUT: "#barcode-input",
  };

  const compileDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 70);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const clickDueDateOptions = async () => {
    const dropDownButtons = await waitForElementWithInterval(() =>
      document.querySelectorAll(SELECTORS.DROPDOWN_TOGGLE)
    );
    const dateOptionsButton = Array.from(dropDownButtons).find((button) =>
      button.textContent.includes("Date Options")
    );
    if (dateOptionsButton) {
      dateOptionsButton.click();
    }
  };
  const clickSpecificDueDate = async () => {
    const dateOptions = await waitForElementWithInterval(() =>
      document.querySelectorAll(SELECTORS.DATE_OPTIONS)
    );
    const specificDueDate = Array.from(dateOptions).find((option) =>
      option.textContent.includes("Specific Due Date")
    );
    if (specificDueDate) {
      specificDueDate.click();
    }
  };

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

  const focusBarcodeInput = async () => {
    const barcodeInput = await waitForElementWithInterval(() =>
      document.querySelector(SELECTORS.BARCODE_INPUT)
    );
    if (barcodeInput) {
      barcodeInput.focus(); // Focus on the input field
    }
  };

  clickDueDateOptions();
  clickSpecificDueDate();
  setDueDate();
  focusBarcodeInput();
})();
