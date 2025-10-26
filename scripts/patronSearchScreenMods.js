// Adds button to patron search screen to limit search to only patron type of "Interlibrary Loan"
(async () => {
  // More robust duplicate prevention because clearly it needs it for some reason
  if (
    document.querySelector("#ill-patron-type-checkbox-div") ||
    document.body.dataset.patronSearchModsLoaded
  ) {
    return;
  }
  document.body.dataset.patronSearchModsLoaded = "true";

  const createPatronTypeCheckbox = async () => {
    return new Promise((resolve) => {
      chrome.storage.local.get("illCheckboxStatus", (data) => {
        const isChecked = data.illCheckboxStatus !== false; // Defaults to checked

        const checkboxDiv = document.createElement("div");
        checkboxDiv.id = "ill-patron-type-checkbox-div";

        Object.assign(checkboxDiv.style, {
          margin: "10px",
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          width: "100%",
          justifyContent: "flex-end",
        });

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
      return;
    }

    const patronSearchElement = document.querySelector("eg-patron-search");
    if (patronSearchElement) {
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
    console.log("Waiting for DOMContentLoaded to insert checkbox");
    document.addEventListener("DOMContentLoaded", insertCheckbox);
  } else {
    insertCheckbox();
  }

  // Limit the observer to prevent excessive calls
  let observerTimeout;
  const observer = new MutationObserver(() => {
    if (window.location.href.includes("staff/circ/patron/search")) {
      // Clear timeout to prevent multiple executions
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
