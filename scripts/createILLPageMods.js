(async () => {
  const { insertRequestToEvergreen, updateInputField } = await import(
    chrome.runtime.getURL("modules/insertRequestToEvergreen.js")
  );
  const { applyStyles } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  // -- Styles --

  const checkboxContainerStyles = {
    padding: "1rem",
    borderRadius: "5px",
    border: "1px solid #701d9d",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    marginTop: "1rem",
  };

  const checkboxStyles = {
    marginLeft: "10px",
    marginRight: "5px",
  };

  const clearFormButtonStyles = {
    marginTop: "1rem",
    padding: "0.5rem 1rem",
    border: "solid 1px #701d9d",
    borderRadius: "0.5rem",
    backgroundColor: "#701d9d",
    color: "#fff",
  };

  const checkboxDivStyles = {
    display: "flex",
    alignItems: "center",
  };

  const alertDivStyles = {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: "1rem",
    borderRadius: "5px",
    border: "1px solid #f5c6cb",
    marginTop: "1rem",
    marginLeft: "1rem",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "1.2em",
    fontWeight: "bold",
  };

  insertRequestToEvergreen();

  const getPatronNote = async () => {
    return new Promise((resolve) => {
      chrome.storage.local.get("requestData", (data) => {
        if (data.requestData) {
          const patronNote = JSON.parse(data.requestData).patronNote;
          resolve(patronNote);
        } else {
          resolve(null);
        }
      });
    });
  };

  // -- DOM Element Creation --
  const createClearFormButton = () => {
    const clearFormButton = document.createElement("button");
    clearFormButton.textContent = "Clear Request Data";
    Object.assign(clearFormButton.style, clearFormButtonStyles);
    clearFormButton.addEventListener("click", () => {
      clearForm();
    });
    return clearFormButton;
  };

  const cleanMessage = (message) => {
    if (message.includes("NTP--")) {
      message = message.replace("NTP--", "Note to Patron:");
    }
    return message;
  };

  const createAlertDiv = (message) => {
    const alertDiv = document.createElement("div");
    alertDiv.id = "ill-alert-div";
    const alertText = document.createElement("p");
    alertText.id = "ill-alert-text";
    alertText.textContent = cleanMessage(message);
    Object.assign(alertDiv.style, alertDivStyles);
    alertDiv.appendChild(alertText);
    return alertDiv;
  };

  const createLeftDiv = () => {
    const leftDiv = document.createElement("div");
    leftDiv.id = "ill-left-mods";
    leftDiv.appendChild(createCheckboxContainer());
    leftDiv.appendChild(createClearFormButton());
    return leftDiv;
  };

  const createRightDiv = async () => {
    const rightDiv = document.createElement("div");
    rightDiv.id = "ill-right-mods";
    const patronNote = await getPatronNote();
    if (patronNote) {
      rightDiv.appendChild(createAlertDiv(patronNote));
    }
    return rightDiv;
  };

  const createILLPageModsContainer = async () => {
    const container = document.createElement("div");
    container.id = "ill-page-mods-container";
    container.style.display = "flex";
    const leftDiv = createLeftDiv();
    const rightDiv = await createRightDiv();
    container.appendChild(leftDiv);
    container.appendChild(rightDiv);
    return container;
  };

  const createCheckboxContainer = () => {
    if (document.querySelector("#checkbox-container")) return;

    const checkboxContainer = document.createElement("div");
    checkboxContainer.id = "checkbox-container";
    Object.assign(checkboxContainer.style, checkboxContainerStyles);

    checkboxContainer.appendChild(
      addILLCheckboxes("ill-bag-checkbox", "ILL came with a bag", "**BAG**\n")
    );
    checkboxContainer.appendChild(
      addILLCheckboxes(
        "ill-box-checkbox",
        "ILL should be returned in a box",
        "**RETURN IN BOX**\n"
      )
    );
    return checkboxContainer;
  };

  const addILLCheckboxes = (checkboxId, labelText, textToPrepend) => {
    // Create container div for the checkbox and label
    const checkboxDiv = document.createElement("div");
    Object.assign(checkboxDiv.style, checkboxDivStyles);

    // Create the checkbox element
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = checkboxId;
    Object.assign(checkbox.style, checkboxStyles);

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
    checkboxDiv.appendChild(checkbox);
    checkboxDiv.appendChild(label);
    return checkboxDiv;
  };

  async function createILLPageMods() {
    // Creates a parent div for the ILL custom checkboxes

    const checkForForm = setInterval(() => {
      if (document.querySelector(".form-validated")) {
        createCheckboxContainer();
        monitorTextarea();
        clearInterval(checkForForm);
      }
    }, 100);

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

    const illModsDiv = await createILLPageModsContainer();
    const parentILLForm = document.querySelector(".form-validated");
    parentILLForm.appendChild(illModsDiv);
  }

  const clearForm = () => {
    chrome.storage.local.remove("requestData");
    updateInputField("#title-input", "ILL Title - ");
    updateInputField("#callnumber-input", "IL");
    updateInputField("#patron-barcode-input", "");
    updateInputField("textarea", "");
    document.querySelector("#ill-bag-checkbox").checked = false;
    document.querySelector("#ill-box-checkbox").checked = false;
    document.querySelector("#title-input").focus();
  };

  createILLPageMods();
})();
