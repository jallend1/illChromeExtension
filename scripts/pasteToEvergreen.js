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

  const addCheckboxWithLabel = (checkboxId, labelText) => {
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

    // Create the label
    const label = document.createElement("label");
    label.style.fontSize = "1.5em";
    label.htmlFor = checkboxId;
    label.appendChild(document.createTextNode(labelText));

    // Append checkbox and label to the div
    div.appendChild(checkbox);
    div.appendChild(label);

    // Append the div to the form
    checkboxContainer.appendChild(div);
  };

  // Creates a highlighted box to contain the two new checkboxes
  const createCheckboxContainer = () => {
    const formValidated = document.querySelector(".form-validated");
    const checkboxContainer = document.createElement("div");
    checkboxContainer.id = "checkbox-container";
    const styles = {
      backgroundColor: "#f0f0f0",
      padding: "10px",
      borderRadius: "5px",
      border: "1px solid #701d9d",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "column",
    };
    applyStyles(checkboxContainer, styles);
    formValidated.appendChild(checkboxContainer);
    addCheckboxWithLabel("ill-bag-checkbox", "ILL came with a bag");
    addCheckboxWithLabel("ill-box-checkbox", "ILL should be returned in a box");
  };

  // If the checkbox is clicked, add 'BAG' to the start of the patron's address field
  document.addEventListener("click", (event) => {
    if (event.target.id === "ill-box-checkbox") {
      const addressField = document.querySelector("textarea");
      if (event.target.checked) {
        addressField.value = "**RETURN IN BOX**\n" + addressField.value;
      } else {
        addressField.value = addressField.value.replace(
          "**RETURN IN BOX**\n",
          ""
        );
      }
      const inputEvent = new Event("input", {
        bubbles: true,
        cancelable: true,
      });
      addressField.dispatchEvent(inputEvent);
    }
    if (event.target.id === "ill-bag-checkbox") {
      const addressField = document.querySelector("textarea");
      if (event.target.checked) {
        addressField.value = "**BAG**\n" + addressField.value;
      } else {
        addressField.value = addressField.value.replace("**BAG**\n", "");
      }
      const inputEvent = new Event("input", {
        bubbles: true,
        cancelable: true,
      });
      addressField.dispatchEvent(inputEvent);
    }
  });

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

  extractArrayFromLocalStorage();
}
pasteToEvergreen();
