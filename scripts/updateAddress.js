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
    permissionGroupInput.dispatchEvent(event);
  };

  const waitForOptionsAndSelect = async (optionText, selector, inputField) => {
    // const selector = '#ngb-typeahead-1 button[role="option"]';
    inputField.click();
    let attempts = 0;

    const selectOption = () => {
      const options = document.querySelectorAll(selector);
      const targetOption = Array.from(options).find(
        (option) => option.textContent.trim() === optionText
      );

      if (targetOption) {
        targetOption.click(); // This simulates selecting the option
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

  // Step 3: Call the function with the desired option text
  const internetAccessOptionSelector =
    '#ngb-typeahead-2-0 button[role="option"]';
  const permissionGroupOptionSelector =
    '#ngb-typeahead-1 button[role="option"]';
  const permissionGroupInput = document.querySelector("#eg-combobox-0");
  const internetAccessInput = document.querySelector(
    "#au-net_access_level-input"
  );

  waitForOptionsAndSelect(
    "ILL",
    permissionGroupOptionSelector,
    permissionGroupInput
  );
  waitForOptionsAndSelect(
    "No Access",
    internetAccessOptionSelector,
    internetAccessInput
  );

  fillUniversalSettings();
};
