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

  //  Selectors and values for the text inputs
  const textInputs = {
    "#au-dob-input": "1980-07-16",
    "#au-family_name-input": "ILL DEPT",
  };

  // Selectors, values, and options for the dropdown inputs
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

  const waitForElement = (selector) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const element = document.querySelector(selector);
        if (element) {
          clearInterval(interval);
          resolve(element);
        }
        if (Date.now() - startTime > 10000) {
          clearInterval(interval);
          reject(new Error(`Element ${selector} not found`));
        }
      });
    });
  };

  const generateEvent = (type) => {
    const event = new Event(type, {
      bubbles: true,
      cancelable: true,
    });
    return event;
  };

  const applyInputValues = async (selector, value) => {
    const input = await waitForElement(selector);

    if (input) {
      input.value = value;
      input.dispatchEvent(generateEvent("input"));
      if (selector === "#au-dob-input") {
        input.dispatchEvent(generateEvent("change")); // DOB requires special handling in order to trigger the change event
      }
    }
  };

  const fillUniversalSettings = () => {
    Object.entries(textInputs).forEach(([selector, value]) => {
      applyInputValues(selector, value);
    });
  };

  function updateAddress() {
    // TODO: Modify error handling to be less nonsensical
    let errorCount = 0;

    const waitForOptionsAndSelect = async (
      optionText,
      selector,
      inputSelector
    ) => {
      // const inputField = document.querySelector(inputSelector);
      const inputField = await waitForElement(inputSelector);

      if (!inputField) {
        errorCount++;
        statusModal(
          `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Something went wrong!</h2> <p style="font-size: 1rem;">Couldn't find the correct fields to update! This is supposed to be used on the Patron Edit Screen if that clarifies things.</p>`,
          "#e85e6a",
          chrome.runtime.getURL("images/kawaii-book-sad.png")
        );
        return;
      }

      console.log("Dropdown clicked.");
      // Options are loaded only after clicking the dropdown, so wait for them to populate
      let attempts = 0;

      const selectOption = () => {
        inputField.click(); // Opens the dropdown
        const options = document.querySelectorAll(selector);
        const targetOption = Array.from(options).find(
          (option) => option.textContent.trim() === optionText
        );

        if (targetOption) {
          targetOption.click();
        } else if (attempts < 100) {
          // Retry up to 10 times
          setTimeout(selectOption, 100); // Wait 100ms before retrying
          attempts++;
        } else {
          errorCount++;
          statusModal(
            `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Something went wrong!</h2> <p style="font-size: 1rem;">The expected options didn't present themselves for reasons that are mysterious to us all.</p>`,
            "#e85e6a",
            chrome.runtime.getURL("images/kawaii-book-sad.png")
          );
        }
      };

      selectOption();

      // If URL includes "register", focus on the #au-first_given_name-input field
      if (window.location.href.includes("register")) {
        const firstNameInput = document.querySelector(
          "#au-first_given_name-input"
        );
        if (firstNameInput) {
          firstNameInput.focus();
          console.log("First name input focused.");
        }
      }
    };

    dropDownSelections.forEach(
      ({ optionText, optionSelector, inputSelector }) => {
        waitForOptionsAndSelect(optionText, optionSelector, inputSelector);
      }
    );

    fillUniversalSettings();

    if (errorCount === 0) {
      statusModal(
        `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Success!</h2> <p style="font-size: 1rem;">Standard address fields have been applied!</p>`,
        "#4CAF50",
        chrome.runtime.getURL("images/kawaii-dinosaur.png")
      );
    }
  }

  updateAddress();
})();
