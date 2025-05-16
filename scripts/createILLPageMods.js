(async () => {
  const { insertRequestToEvergreen, updateInputField } = await import(
    chrome.runtime.getURL("modules/insertRequestToEvergreen.js")
  );

  // -- Styles --
  const illPageModStyles = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    maxWidth: "1000px",
  };

  const checkboxContainerStyles = {
    padding: "1.5rem 1.5rem",
    borderRadius: "1rem",
    border: "none",
    background: "linear-gradient(90deg, #43b97f 0%, #b2f7cc 100%)",
    boxShadow: "0 4px 24px 0 rgba(34, 139, 34, 0.10)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "stretch",
    gap: "1.25rem",
    marginTop: "1.5rem",
    marginBottom: "1.5rem",
    maxWidth: "400px",
    transition: "box-shadow 0.2s",
  };

  const checkboxStyles = {
    accentColor: "#701d9d",
    width: "1.25em",
    height: "1.25em",
    marginRight: "1em",
    marginLeft: "0",
    cursor: "pointer",
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
    background: "#fff",
    borderRadius: "0.5rem",
    padding: "0.5rem 1rem",
    boxShadow: "0 1px 4px 0 rgba(112, 29, 157, 0.06)",
    transition: "background 0.2s",
  };

  const labelStyles = {
    fontSize: "1.1em",
    color: "#3a2352",
    fontWeight: "500",
    cursor: "pointer",
  };

  const alertDivStyles = {
    background: "linear-gradient(90deg, #ff7b7b 0%, #dc3545 50%, #ff7b7b 100%)",
    color: "white",
    padding: "1.25rem 1.5rem",
    borderRadius: "8px",
    border: "1px solid #f5c6cb",
    marginTop: "1rem",
    marginLeft: "1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontWeight: "bold",
    boxShadow: "0 2px 8px rgba(220, 53, 69, 0.08)",
    borderLeft: "8px solid #dc3545",
    borderRight: "8px solid #dc3545",
  };

  const smallHeaderStyles = {
    fontSize: "1.25em",
    color: "#fff",
    textAlign: "center",
    textShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
  };

  const alertIconStyles = {
    fontSize: "2em",
    marginRight: "0.75rem",
    flexShrink: "0",
    filter: "drop-shadow(0 1px 2px rgba(220,53,69,0.15))",
  };

  // -- Event Listeners --
  const checkboxListenerCallback = (e, textToPrepend) => {
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
  };

  const textareaListener = (addressField) => {
    const bagCheckbox = document.querySelector("#ill-bag-checkbox");
    const boxCheckbox = document.querySelector("#ill-box-checkbox");
    addressField.value.includes("**BAG**")
      ? (bagCheckbox.checked = true)
      : (bagCheckbox.checked = false);
    addressField.value.includes("**RETURN IN BOX**")
      ? (boxCheckbox.checked = true)
      : (boxCheckbox.checked = false);
  };

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
    clearFormButton.textContent = "Erase the Request Data";
    Object.assign(clearFormButton.style, clearFormButtonStyles);
    clearFormButton.addEventListener("click", () => {
      clearForm();
    });
    return clearFormButton;
  };

  const cleanMessage = (message) => {
    if (message.includes("NTP--")) {
      message = message.replace("NTP--", "Note to Patron: ");
    }
    return message;
  };

  const createAlertDiv = (message) => {
    const alertDiv = document.createElement("div");
    alertDiv.id = "ill-alert-div";
    Object.assign(alertDiv.style, alertDivStyles);
    // If message doesn't include "NTP" instead of a red gradient, use a blue one
    if (!message.includes("NTP")) {
      alertDiv.style.background =
        "linear-gradient(90deg, #007bff 0%, #0056b3 50%, #007bff 100%)";
      alertDiv.style.borderLeft = "8px solid #0056b3";
      alertDiv.style.borderRight = "8px solid #0056b3";
    }

    // Create a little header
    const smallHeader = document.createElement("h2");
    smallHeader.textContent = message.includes("NTP")
      ? "Please write on the sticker:"
      : "Verification needed!";
    Object.assign(smallHeader.style, smallHeaderStyles);

    const headerDiv = document.createElement("div");
    headerDiv.style.textAlign = "center";
    headerDiv.style.marginBottom = "1rem";
    headerDiv.appendChild(smallHeader);

    // Create a main body div
    const bodyDiv = document.createElement("div");
    bodyDiv.style.textAlign = "center";
    bodyDiv.style.display = "flex";
    bodyDiv.style.alignItems = "center";
    bodyDiv.style.justifyContent = "space-between";

    // Create left icon
    const leftIcon = document.createElement("span");
    leftIcon.textContent = "⚠️";
    Object.assign(leftIcon.style, alertIconStyles);

    // Create right icon
    const rightIcon = document.createElement("span");
    rightIcon.textContent = "⚠️";
    Object.assign(rightIcon.style, alertIconStyles);

    const alertText = document.createElement("p");
    alertText.id = "ill-alert-text";
    alertText.textContent = cleanMessage(message);
    alertText.style.margin = "0";

    bodyDiv.appendChild(leftIcon);
    bodyDiv.appendChild(alertText);
    bodyDiv.appendChild(rightIcon);

    alertDiv.appendChild(headerDiv);
    alertDiv.appendChild(bodyDiv);

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
    if (document.querySelector("#checkbox-container")) return;
    const container = document.createElement("div");
    container.id = "ill-page-mods-container";
    Object.assign(container.style, illPageModStyles);
    const leftDiv = createLeftDiv();
    const rightDiv = await createRightDiv();
    container.appendChild(leftDiv);
    container.appendChild(rightDiv);
    return container;
  };

  const createCheckboxContainer = () => {
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
    const checkboxDiv = document.createElement("div");
    Object.assign(checkboxDiv.style, checkboxDivStyles);

    // Create the checkbox element
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = checkboxId;
    Object.assign(checkbox.style, checkboxStyles);

    // Create the label
    const label = document.createElement("label");

    Object.assign(label.style, labelStyles);
    label.htmlFor = checkboxId;
    label.appendChild(document.createTextNode(labelText));

    // Append checkbox and label to the div
    checkboxDiv.appendChild(checkbox);
    checkboxDiv.appendChild(label);

    // Adds listener to the checkbox to prepend the text to the address field
    checkbox.addEventListener("click", (e) =>
      checkboxListenerCallback(e, textToPrepend)
    );
    return checkboxDiv;
  };

  // Ensure textarea matches the checkbox values
  const monitorTextarea = () => {
    const addressField = document.querySelector("textarea");
    if (!addressField) return;
    addressField.addEventListener("input", () =>
      textareaListener(addressField)
    );
  };

  const monitorBarcodeInput = () => {
    const itemBarcodeInput = document.querySelector("#item-barcode-input");
    if (itemBarcodeInput) {
      itemBarcodeInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const submitButton = document.querySelector(".btn.btn-success");
          if (submitButton) {
            submitButton.focus();
          }
        }
      });
    }
  };

  // -- Main Function --
  async function createILLPageMods() {
    const checkForForm = setInterval(async () => {
      const parentILLForm = document.querySelector(".form-validated");
      if (parentILLForm) {
        insertRequestToEvergreen();
        const illModsDiv = await createILLPageModsContainer();
        if (illModsDiv) {
          parentILLForm.appendChild(illModsDiv);
          monitorTextarea();
          monitorBarcodeInput();
          clearInterval(checkForForm);
        }
      }
    }, 100);
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
