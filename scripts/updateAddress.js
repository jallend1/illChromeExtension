(async () => {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );

  function updateAddress() {
    const fillUniversalSettings = () => {
      const inputs = {
        "#au-dob-input": "1980-07-16",
        "#au-family_name-input": "ILL DEPT",
      };

      Object.entries(inputs).forEach(([selector, value]) => {
        const input = document.querySelector(selector);
        if (input) {
          input.value = value;
          const inputEvent = new Event("input", {
            bubbles: true,
            cancelable: true,
          });
          input.dispatchEvent(inputEvent);
          // TODO: Limit this to just DOB if that's the only one that needs it?
          // Change event required in order to get the DOB to save
          const changeEvent = new Event("change", {
            bubbles: true,
            cancelable: true,
          });
          input.dispatchEvent(changeEvent);
        }
      });
    };

    const waitForOptionsAndSelect = async (
      optionText,
      selector,
      inputSelector
    ) => {
      const inputField = document.querySelector(inputSelector);
      if (!inputField) {
        statusModal(
          `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Something went wrong!</h2> <p style="font-size: 1rem;">Couldn't find the correct fields to update! This is supposed to be used on the Patron Edit Screen if that clarifies things.</p>`,
          "#e85e6a",
          chrome.runtime.getURL("images/kawaii-book-sad.png")
        );
        return;
      }

      inputField.click(); // Opens the dropdown
      // Options are loaded only after clicking the dropdown, so wait for them to populate
      let attempts = 0;

      const selectOption = () => {
        const options = document.querySelectorAll(selector);
        const targetOption = Array.from(options).find(
          (option) => option.textContent.trim() === optionText
        );

        if (targetOption) {
          targetOption.click();
        } else if (attempts < 10) {
          // Retry up to 10 times
          setTimeout(selectOption, 100); // Wait 100ms before retrying
          attempts++;
        } else {
          statusModal(
            `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Something went wrong!</h2> <p style="font-size: 1rem;">The expected options didn't present themselves for reasons that are mysterious to us all.</p>`,
            "#e85e6a",
            chrome.runtime.getURL("images/kawaii-book-sad.png")
          );
        }
      };

      selectOption();
    };

    //   Data to navigate the dropdowns and fill in the fields
    const selections = [
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

    selections.forEach(({ optionText, optionSelector, inputSelector }) => {
      waitForOptionsAndSelect(optionText, optionSelector, inputSelector);
    });

    fillUniversalSettings();
  }

  updateAddress();
})();
