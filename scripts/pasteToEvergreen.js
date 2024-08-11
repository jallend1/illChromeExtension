function pasteToEvergreen() {
  const updateInputField = (selector, value, prefix = "") => {
    const inputField = document.querySelector(selector);
    inputField.value = prefix + value;
    const event = new Event("input", {
      bubbles: true,
      cancelable: true,
    });
    inputField.dispatchEvent(event);
  };

  const updateTitle = (title) => {
    updateInputField("#title-input", title, "ILL Title - ");
  };

  const updateCallNumber = (requestNumber) => {
    updateInputField("#callnumber-input", requestNumber, "IL");
  };

  const updatePatronBarcode = (patronID) => {
    updateInputField("#patron-barcode-input", patronID);
  };

  const updatePatronAddress = (addressString) => {
    updateInputField("textarea", addressString);
  };

  const applyStyles = (element, styles) => {
    for (const property in styles) {
      element.style[property] = styles[property];
    }
  };

  const checkForExistingCheckboxDiv = () => {
    const existingCheckboxContainer = document.querySelector(
      "#checkbox-container"
    );
    if (existingCheckboxContainer) {
      existingCheckboxContainer.remove();
    }
  };

  const addILLCheckboxes = (checkboxId, labelText, textToPrepend) => {
    const checkboxContainer = document.querySelector("#checkbox-container");

    // Create a div with flex style
    const div = document.createElement("div");
    const divStyles = {
      display: "flex",
      alignItems: "center",
    };
    applyStyles(div, divStyles);

    // Create the checkbox input
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
    const parentILLForm = document.querySelector(".form-validated");
    const checkboxContainer = document.createElement("div");
    checkboxContainer.id = "checkbox-container";

    // Styles for the checkbox container
    const styles = {
      backgroundColor: "#fff",
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
  };

  const extractArrayFromLocalStorage = () => {
    chrome.storage.local.get("requestData", (result) => {
      if (!result.requestData) {
        console.log("No data to paste!");
        return;
      } else {
        const { addressString, requestNumber, title, patronID, isLendingFee } =
          JSON.parse(result.requestData);
        updateTitle(title);
        updateCallNumber(requestNumber);
        updatePatronBarcode(patronID);
        updatePatronAddress(addressString);
        if (isLendingFee !== "0.00") {
          alert(
            `This request might have a lending fee of $${isLendingFee}. Please verify and add it to the patron's record.`
          );
        }
        createCheckboxContainer();
        // TODO: Seems impossible to focus on the item barcode from sidebar but functions as expected with keyboard shortcut?
        const kclsBarcodeInput = document.querySelector("#item-barcode-input");
        kclsBarcodeInput.focus();
      }
    });
  };

  // TODO: Pressing enter seems to submit the form, which I don't think is the demonstrated behavior on local client
  // document.addEventListener("keydown", (e) => {
  //   if (e.key === "Enter") {
  //     const buttons = document.querySelectorAll("button");
  //     buttons.forEach((button) => {
  //       if (button.textContent === "Create Item") {
  //         button.focus();
  //       }
  //     });
  //   }
  // });

  checkForExistingCheckboxDiv();
  extractArrayFromLocalStorage();
}
pasteToEvergreen();
