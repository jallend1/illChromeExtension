// Adds button to patron search screen to limit search to only patron type of "Interlibrary Loan"
(async () => {
  const createPatronTypeCheckbox = () => {
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
    checkbox.checked = false;
    checkbox.addEventListener("click", () => {
      updateProfileGroupFilter();
    });

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.appendChild(document.createTextNode("Limit to Interlibrary Loan"));

    checkboxDiv.appendChild(checkbox);
    checkboxDiv.appendChild(label);

    return checkboxDiv;
  };

  const updateProfileGroupFilter = () => {
    const checkbox = document.querySelector("#ill-patron-type-checkbox");
    // Reset the search filters if the checkbox is unchecked
    if (!checkbox.checked) {
      const resetButton = document.querySelector("button.btn.btn-warning");
      if (resetButton) {
        resetButton.click();
      }
      return;
    }
    // Set the Profile Group filter to ILL if the checkbox is checked
    else {
      const profileGroupMenu = document.querySelector(
        'input[placeholder="Profile Group"]'
      );
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
      profileGroupMenu.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const insertCheckbox = () => {
    const patronSearchElement = document.querySelector("eg-patron-search");
    if (
      patronSearchElement &&
      !document.querySelector("#ill-patron-type-checkbox-div")
    ) {
      const checkboxDiv = createPatronTypeCheckbox();
      patronSearchElement.parentNode.insertBefore(
        checkboxDiv,
        patronSearchElement
      );
    }
    updateProfileGroupFilter();
  };

  // TODO: Disabled for now since it's causing some issues :(
  // const observer = new MutationObserver(() => {
  //   if (window.location.href.includes("staff/circ/patron/search")) {
  //     insertCheckbox();
  //   }
  // });

  // observer.observe(document.body, {
  //   childList: true,
  //   subtree: true,
  // });

  // // TODO: Was being run on incorrect page...Feel like this check shouldn't be necessary...and yet
  // if (window.location.href.includes("staff/circ/patron/search")) {
  //   insertCheckbox();
  // }
})();
