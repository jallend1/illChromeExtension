// **************************************
// *      Update Address Script         *
// **************************************
// This script is designed to be run from the Evergreen web client. It will
// update the address fields for ILL accounts to a standard set of values. This
// includes setting the Patron Permission Type to ILL, Internet Access Level to No Access,
// and Library District of Residence to Unset. It also fills in the universal settings
// for the account, including a default date of birth and 'ILL DEPT' as family name.

(async () => {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );
  const { waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  // -- Configuration Object --
  const CONFIG = {
    // Modal messages
    messages: {
      error: {
        heading: "Something went wrong!",
        text: "Couldn't find the correct fields to update! This is supposed to be used on the Patron Edit Screen if that clarifies things.",
        color: "#e85e6a",
        image: chrome.runtime.getURL("images/kawaii-book-sad.png"),
      },
      working: {
        heading: "Please wait...",
        text: "Attempting to fill standard address fields.",
        color: "#ffc107",
        image: chrome.runtime.getURL("images/beaver.png"),
      },
      success: {
        heading: "Success!",
        text: "Standard address fields have been applied!",
        color: "#4CAF50",
        image: chrome.runtime.getURL("images/kawaii-dinosaur.png"),
      },
    },

    // Form field values
    textInputs: {
      "#au-dob-input": "1980-07-16",
      "#au-family_name-input": "ILL DEPT",
    },

    // Dropdown configurations
    dropdowns: [
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
    ],

    // Retry configuration
    retry: {
      maxAttempts: 100,
      delay: 100,
    },
  };

  // -- Utility Functions --
  /**
   * Displays a status modal with a specific message type.
   * @param {string} type
   */
  const showModal = (type) => {
    const config = CONFIG.messages[type];
    statusModal(config.heading, config.text, config.color, config.image);
  };

  /**
   * Generates a DOM event of the specified type
   * @param {string} type
   * @returns {Event}
   */
  const generateEvent = (type) => {
    return new Event(type, {
      bubbles: true,
      cancelable: true,
    });
  };

  /**
   * Applies a value to an input field and dispatches necessary events
   * @param {string} selector
   * @param {string} value
   */
  const applyInputValues = async (selector, value) => {
    const input = await waitForElementWithInterval(selector);
    if (!input) throw new Error(`Input field ${selector} not found`);
    input.value = value;
    input.dispatchEvent(generateEvent("input"));
    if (selector === "#au-dob-input") {
      input.dispatchEvent(generateEvent("change"));
    }
  };

  /**
   * Waits for dropdown options to appear and selects the specified options
   * @param {string} optionText
   * @param {string} selector
   * @param {string} inputSelector
   * @returns {Promise<void>}
   */
  const waitForOptionsAndSelect = async (
    optionText,
    selector,
    inputSelector
  ) => {
    const inputField = await waitForElementWithInterval(inputSelector);
    if (!inputField)
      throw new Error(`Dropdown input ${inputSelector} not found`);

    let attempts = 0;
    const maxAttempts = CONFIG.retry.maxAttempts;
    const delay = CONFIG.retry.delay;

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

  /**
   * Fills in the settings that are universal across all accounts
   * @returns {Promise<void>}
   */
  const fillUniversalSettings = async () => {
    for (const [selector, value] of Object.entries(CONFIG.textInputs)) {
      await applyInputValues(selector, value);
    }
  };

  // -- Main Function --
  /**
   * Updates the address fields on the patron edit screen
   * @returns {Promise<void>}
   */
  async function updateAddress() {
    const currentUrl = window.location.href;
    try {
      showModal("working");
      for (const {
        optionText,
        optionSelector,
        inputSelector,
      } of CONFIG.dropdowns) {
        await waitForOptionsAndSelect(
          optionText,
          optionSelector,
          inputSelector
        );
      }

      await fillUniversalSettings();

      showModal("success");
    } catch (err) {
      // If the user navigates away from the page, cut our losses and don't show an error
      if (window.location.href !== currentUrl) {
        return;
      }
      console.error(err);
      showModal("error");
    }
  }

  if (
    !window.location.href.includes("register") &&
    !window.location.href.includes("edit")
  ) {
    showModal("error");
    return;
  }
  await updateAddress();
})();
