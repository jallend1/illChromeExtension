// **************************************
// *      Update Address Script         *
// **************************************
// This script is designed to be run from the Evergreen web client. It will
// update the address fields for ILL accounts to a standard set of values. This
// includes setting the Patron Permission Type to ILL, Internet Access Level to No Access,
// and Library District of Residence to Unset. It also fills in the universal settings
// for the account, including a default date of birth and 'ILL DEPT' as family name.
// ...existing code...

(async () => {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );
  const { waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  // -- Constants for modal messages --
  const ERROR_HEADING = "Something went wrong!";
  const ERROR_COLOR = "#e85e6a";
  const ERROR_MSG =
    "Couldn't find the correct fields to update! This is supposed to be used on the Patron Edit Screen if that clarifies things.";
  const ERROR_IMG = chrome.runtime.getURL("images/kawaii-book-sad.png");
  const WORKING_HEADING = "Please wait...";
  const SUCCESS_HEADING = "Success!";
  const SUCCESS_MSG = "Standard address fields have been applied!";
  const SUCCESS_COLOR = "#4CAF50";
  const SUCCESS_IMG = chrome.runtime.getURL("images/kawaii-dinosaur.png");

  const WORKING_MSG = "Attempting to fill standard address fields.";
  const WORKING_COLOR = "#ffc107";
  const WORKING_IMG = chrome.runtime.getURL("images/beaver.png");

  //  -- Constants for text inputs --
  const textInputs = {
    "#au-dob-input": "1980-07-16",
    "#au-family_name-input": "ILL DEPT",
  };

  // -- Constants for dropdown selections --
  const dropDownSelections = [
    {
      field: "Patron Permission Type",
      optionText: "ILL",
      optionSelector:
        '[role="listbox"].dropdown-menu.show button[role="option"]',
      inputSelector: 'eg-combobox[placeholder="Profile Group"] input',
    },
    {
      field: "Internet Access Level",
      optionText: "No Access",
      optionSelector: "#au-net_access_level-input-101",
      inputSelector: "#au-net_access_level-input",
    },
    {
      field: "Library District of Residence",
      optionText: "Unset",
      optionSelector: "#asc-12-input-210182",
      inputSelector: "#asc-12-input",
    },
  ];

  // -- Utility Functions --
  const generateEvent = (type) => {
    return new Event(type, {
      bubbles: true,
      cancelable: true,
    });
  };

  const applyInputValues = async (selector, value) => {
    const input = await waitForElementWithInterval(selector);
    if (!input) throw new Error(`Input field ${selector} not found`);
    input.value = value;
    input.dispatchEvent(generateEvent("input"));
    if (selector === "#au-dob-input") {
      input.dispatchEvent(generateEvent("change"));
    }
  };

  const waitForOptionsAndSelect = async (
    optionText,
    selector,
    inputSelector
  ) => {
    const inputField = await waitForElementWithInterval(inputSelector);
    if (!inputField)
      throw new Error(`Dropdown input ${inputSelector} not found`);

    let attempts = 0;
    const maxAttempts = 100;
    const delay = 100;

    return new Promise((resolve, reject) => {
      const trySelect = () => {
        inputField.click();
        const options = document.querySelectorAll(selector);
        const targetOption = Array.from(options).find(
          (option) => option.textContent.trim() === optionText
        );
        if (targetOption) {
          targetOption.click();
          // Focus on first name input if on register page
          if (window.location.href.includes("register")) {
            const firstNameInput = document.querySelector(
              "#au-first_given_name-input"
            );
            if (firstNameInput) firstNameInput.focus();
          }
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(trySelect, delay);
        } else {
          reject(
            new Error(
              `Option "${optionText}" not found for selector ${selector}`
            )
          );
        }
      };
      trySelect();
    });
  };

  const fillUniversalSettings = async () => {
    for (const [selector, value] of Object.entries(textInputs)) {
      await applyInputValues(selector, value);
    }
  };

  const showErrorModal = () => {
    statusModal(ERROR_HEADING, ERROR_MSG, ERROR_COLOR, ERROR_IMG);
  };

  // -- Main Function --
  async function updateAddress() {
    const currentUrl = window.location.href;
    try {
      statusModal(WORKING_HEADING, WORKING_MSG, WORKING_COLOR, WORKING_IMG);
      for (const {
        optionText,
        optionSelector,
        inputSelector,
      } of dropDownSelections) {
        await waitForOptionsAndSelect(
          optionText,
          optionSelector,
          inputSelector
        );
      }

      await fillUniversalSettings();

      statusModal(SUCCESS_HEADING, SUCCESS_MSG, SUCCESS_COLOR, SUCCESS_IMG);
    } catch (err) {
      // If the user navigates away from the page, cut our losses and don't show an error
      if (window.location.href !== currentUrl) {
        return;
      }
      console.error(err);
      showErrorModal();
    }
  }

  if (
    !window.location.href.includes("register") &&
    !window.location.href.includes("edit")
  ) {
    statusModal(
      ERROR_HEADING,
      ERROR_MSG,
      ERROR_COLOR,
      chrome.runtime.getURL("images/kawaii-book-sad.png")
    );
    return;
  }
  await updateAddress();
})();
