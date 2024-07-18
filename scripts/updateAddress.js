console.log("Here we go!");
const updateAddress = () => {
  const fillUniversalSettings = () => {
    const dobInput = document.querySelector("#au-dob-input");
    const familyNameInput = document.querySelector("#au-family_name-input");
    dobInput.value = "1980-07-16";
    familyNameInput.value = "ILL DEPT";

    const event = new Event("input", {
      bubbles: true,
      cancelable: true,
    });

    dobInput.dispatchEvent(event);
    familyNameInput.dispatchEvent(event);
  };

  const waitForOptionsAndSelect = async (
    optionText,
    selector,
    inputSelector
  ) => {
    const inputField = document.querySelector(inputSelector);
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
        console.log(
          `Option "${optionText}" selected after ${attempts} attempts.`
        );
      } else if (attempts < 10) {
        // Retry up to 10 times
        setTimeout(selectOption, 100); // Wait 100ms before retrying
        attempts++;
      } else {
        console.log(`Option "${optionText}" not found.`);
      }
    };

    selectOption();
  };

  //   Data to navigate the dropdowns and fill in the fields
  const selections = [
    {
      field: "Patron Permission Type",
      optionText: "ILL",
      optionSelector: '#ngb-typeahead-1 button[role="option"]',
      inputSelector: "#eg-combobox-0",
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
};
