(async () => {
  const { insertRequestToEvergreen, updateInputField } = await import(
    chrome.runtime.getURL("modules/insertRequestToEvergreen.js")
  );

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

  // -- Helper Functions --

  const cleanMessage = (message) => {
    if (message.includes("NTP--")) {
      message = message.replace("NTP--", "Note to Patron: ");
    }
    return message;
  };

  // -- DOM Element Creation --

  const createClearFormButton = () => {
    const clearFormButton = document.createElement("button");
    clearFormButton.id = "clear-form-button";
    clearFormButton.textContent = "Erase the Request Data";
    clearFormButton.addEventListener("click", () => {
      clearForm();
    });
    return clearFormButton;
  };

  const createAlertDiv = (message) => {
    const alertDiv = document.createElement("div");
    alertDiv.id = "ill-alert-div";
    // If message doesn't include "NTP" use a blue gradient because things are chill
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

    const headerDiv = document.createElement("div");
    headerDiv.appendChild(smallHeader);

    // Create a main body div
    const bodyDiv = document.createElement("div");
    bodyDiv.classList.add("alert-body");

    // Create icons
    const leftIcon = document.createElement("span");
    leftIcon.textContent = "⚠️";
    leftIcon.classList.add("ill-alert-icon");
    const rightIcon = document.createElement("span");
    rightIcon.textContent = "⚠️";
    rightIcon.classList.add("ill-alert-icon");

    // Create the alert text
    const alertText = document.createElement("p");
    alertText.id = "ill-alert-text";
    alertText.textContent = cleanMessage(message);

    // Append everything to the body div
    bodyDiv.appendChild(leftIcon);
    bodyDiv.appendChild(alertText);
    bodyDiv.appendChild(rightIcon);

    // Append the header and body divs to the alert div
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
    const leftDiv = createLeftDiv();
    const rightDiv = await createRightDiv();
    container.appendChild(leftDiv);
    container.appendChild(rightDiv);
    return container;
  };

  const createCheckboxContainer = () => {
    const checkboxContainer = document.createElement("div");
    checkboxContainer.id = "checkbox-container";

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
    checkboxDiv.classList.add("checkbox-div");

    // Create the checkbox element
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = checkboxId;
    checkbox.classList.add("ill-checkbox");

    // Create the label
    const label = document.createElement("label");
    label.htmlFor = checkboxId;
    label.appendChild(document.createTextNode(labelText));
    label.classList.add("ill-checkbox-label");

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

  /**
   * Checks if the current page is an Evergreen client page
   * @returns {boolean} True if the current page is an Evergreen client page
   */
  const isEvergreenPage = () => {
    const url = window.location.href;
    return url.includes("evgclient") || url.includes("evgmobile");
  };

  // -- Main Function --
  async function createILLPageMods() {
    if (!isEvergreenPage() || document.body.dataset.createILLPageMods) return;

    document.body.dataset.createILLPageMods = "true";
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
