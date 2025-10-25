// Adds button to patron search screen to limit search to only patron type of "Interlibrary Loan"
(async () => {
  console.log("patronSearchScreenMods script loaded");

  // More robust duplicate prevention
  if (
    document.querySelector("#ill-patron-type-checkbox-div") ||
    document.body.dataset.patronSearchModsLoaded
  ) {
    console.log("Script already executed or checkbox already exists");
    return;
  }
  document.body.dataset.patronSearchModsLoaded = "true";

  const createPatronTypeCheckbox = async () => {
    return new Promise((resolve) => {
      chrome.storage.local.get("illCheckboxStatus", (data) => {
        const isChecked = data.illCheckboxStatus !== false; // Default to true

        const checkboxDiv = document.createElement("div");
        checkboxDiv.id = "ill-patron-type-checkbox-div";
        checkboxDiv.style.margin = "10px";
        checkboxDiv.style.display = "inline-flex";
        checkboxDiv.style.alignItems = "center";
        checkboxDiv.style.gap = "5px";
        checkboxDiv.style.width = "100%";
        checkboxDiv.style.justifyContent = "flex-end";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = "ill-patron-type-checkbox";
        checkbox.checked = isChecked;
        checkbox.addEventListener("change", () => {
          // Save the state to storage
          chrome.storage.local.set({ illCheckboxStatus: checkbox.checked });
          updateProfileGroupFilter();
        });

        const label = document.createElement("label");
        label.htmlFor = checkbox.id;
        label.appendChild(
          document.createTextNode("Limit to Interlibrary Loan")
        );

        checkboxDiv.appendChild(checkbox);
        checkboxDiv.appendChild(label);

        resolve(checkboxDiv);
      });
    });
  };

  const updateProfileGroupFilter = () => {
    const checkbox = document.querySelector("#ill-patron-type-checkbox");
    if (!checkbox) return;

    // Reset the search filters if the checkbox is unchecked
    if (!checkbox.checked) {
      const resetButton = document.querySelector("button.btn.btn-warning");
      if (resetButton) {
        resetButton.click();
      }
      return;
    }

    // Set the Profile Group filter to ILL if the checkbox is checked
    const profileGroupMenu = document.querySelector(
      'input[placeholder="Profile Group"]'
    );

    if (!profileGroupMenu) return;
    if (profileGroupMenu.value === "ILL") return;

    profileGroupMenu.click();
    // Sets short timeout to allow the dropdown to render
    setTimeout(() => {
      const dropdownOption = Array.from(
        document.querySelectorAll("button.dropdown-item")
      ).find((item) => item.innerText.trim() === "ILL");
      if (dropdownOption) {
        dropdownOption.click();
      }
    }, 100);
  };

  const insertCheckbox = async () => {
    if (!window.location.href.includes("staff/circ/patron/search")) {
      return;
    }

    // Additional check to prevent duplicates
    if (document.querySelector("#ill-patron-type-checkbox-div")) {
      console.log("Checkbox already exists, skipping insertion");
      return;
    }

    const patronSearchElement = document.querySelector("eg-patron-search");
    if (patronSearchElement) {
      console.log("Creating checkbox");
      const checkboxDiv = await createPatronTypeCheckbox();
      patronSearchElement.parentNode.insertBefore(
        checkboxDiv,
        patronSearchElement
      );

      // Apply the filter based on initial checkbox state
      setTimeout(() => updateProfileGroupFilter(), 200);
    }
  };

  // Wait for page to load, then insert checkbox
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", insertCheckbox);
  } else {
    insertCheckbox();
  }

  // Limit the observer to prevent excessive calls
  let observerTimeout;
  const observer = new MutationObserver(() => {
    if (window.location.href.includes("staff/circ/patron/search")) {
      // Debounce the calls to prevent multiple rapid executions
      clearTimeout(observerTimeout);
      observerTimeout = setTimeout(() => {
        insertCheckbox();
      }, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
