(async () => {
  const { insertRequestToEvergreen } = await import(
    chrome.runtime.getURL("modules/insertRequestToEvergreen.js")
  );

  insertRequestToEvergreen();

  function createILLPageMods() {
    const applyStyles = (element, styles) => {
      for (const property in styles) {
        element.style[property] = styles[property];
      }
    };

    const removeExistingCheckboxContainer = () => {
      const existingCheckboxContainer = document.querySelector(
        "#checkbox-container"
      );
      if (existingCheckboxContainer) {
        existingCheckboxContainer.remove();
      }
    };

    const createClearFormButton = () => {
      const clearFormButton = document.createElement("button");
      clearFormButton.textContent = "Clear Request Data";
      clearFormButton.style.marginTop = "1rem";
      clearFormButton.style.padding = "0.5rem 1rem";
      clearFormButton.style.border = "solid 1px #701d9d";
      clearFormButton.style.borderRadius = "0.5rem";
      clearFormButton.style.backgroundColor = "#701d9d";
      clearFormButton.style.color = "#fff";

      clearFormButton.addEventListener("click", () => {
        clearForm();
      });

      document
        .querySelector("#checkbox-container")
        .appendChild(clearFormButton);
    };

    const addILLCheckboxes = (checkboxId, labelText, textToPrepend) => {
      const checkboxContainer = document.querySelector("#checkbox-container");

      // Create container div for the checkbox and label
      const div = document.createElement("div");
      const divStyles = {
        display: "flex",
        alignItems: "center",
      };
      applyStyles(div, divStyles);

      // Create the checkbox element
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = checkboxId;
      const checkboxStyles = {
        marginLeft: "10px",
        marginRight: "5px",
      };
      applyStyles(checkbox, checkboxStyles);

      // Adds listener to the checkbox to prepend the text to the address field
      checkbox.addEventListener("click", (e) => {
        const addressField = document.querySelector("textarea");
        if (e.target.checked) {
          addressField.value = textToPrepend + addressField.value;
        } else {
          addressField.value = addressField.value.replace(textToPrepend, "");
        }
        const inputEvent = new Event("input", {
          bubbles: true,
          cancelable: true,
        });
        addressField.dispatchEvent(inputEvent);
      });

      // Create the label
      const label = document.createElement("label");
      label.style.fontSize = "1.5em";
      label.htmlFor = checkboxId;
      label.appendChild(document.createTextNode(labelText));

      // Append checkbox and label to the div
      div.appendChild(checkbox);
      div.appendChild(label);

      // Adds the checkbox div to the form
      checkboxContainer.appendChild(div);
    };

    // Creates a parent div for the ILL custom checkboxes
    const createCheckboxContainer = () => {
      removeExistingCheckboxContainer();
      const parentILLForm = document.querySelector(".form-validated");
      const checkboxContainer = document.createElement("div");
      checkboxContainer.id = "checkbox-container";

      // Styles for the checkbox container
      const styles = {
        padding: "1rem",
        borderRadius: "5px",
        border: "1px solid #701d9d",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        marginTop: "1rem",
      };

      applyStyles(checkboxContainer, styles);

      parentILLForm.appendChild(checkboxContainer);

      // Add checkboxes to the container
      addILLCheckboxes("ill-bag-checkbox", "ILL came with a bag", "**BAG**\n");
      addILLCheckboxes(
        "ill-box-checkbox",
        "ILL should be returned in a box",
        "**RETURN IN BOX**\n"
      );
      createClearFormButton();
    };

    removeExistingCheckboxContainer();
    createCheckboxContainer();

    const checkForForm = setInterval(() => {
      if (document.querySelector(".form-validated")) {
        createCheckboxContainer();
        monitorTextarea();
        clearInterval(checkForForm);
      }
    }, 1000);

    const monitorTextarea = () => {
      const addressField = document.querySelector("textarea");
      if (!addressField) return;
      addressField.addEventListener("input", () => {
        const bagCheckbox = document.querySelector("#ill-bag-checkbox");
        const boxCheckbox = document.querySelector("#ill-box-checkbox");
        addressField.value.includes("**BAG**")
          ? (bagCheckbox.checked = true)
          : (bagCheckbox.checked = false);
        addressField.value.includes("**RETURN IN BOX**")
          ? (boxCheckbox.checked = true)
          : (boxCheckbox.checked = false);
      });
    };
  }

  const clearForm = () => {
    // TODO: Taken from insertRequestToEvergreen, so...refactor is due at some point
    const updateInputField = (selector) => {
      const inputField = document.querySelector(selector);
      if (!inputField) {
        statusModal(result, headerColor, imgURL);
        return;
      }
      inputField.value = "";
      const event = new Event("input", {
        bubbles: true,
        cancelable: true,
      });
      inputField.dispatchEvent(event);
    };

    chrome.storage.local.remove("requestData");
    updateInputField("#title-input");
    updateInputField("#callnumber-input");
    updateInputField("#patron-barcode-input");
    updateInputField("textarea");
    document.querySelector("#ill-bag-checkbox").checked = false;
    document.querySelector("#ill-box-checkbox").checked = false;
    document.querySelector("#title-input").focus();
  };

  createILLPageMods();
})();
