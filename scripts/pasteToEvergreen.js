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

  const addCheckbox = () => {
    const formValidated = document.querySelector("#checkbox-container");

    // Create a div with flex style
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center"; // Align items vertically in the center

    // Create the checkbox input
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "ill-bag-checkbox";
    checkbox.style.marginLeft = "10px";
    checkbox.style.marginRight = "5px";

    // Create the label
    const label = document.createElement("label");
    label.style.fontSize = "1.5em";
    label.htmlFor = "ill-bag-checkbox";
    label.appendChild(document.createTextNode("ILL came with a bag"));

    // Append checkbox and label to the div
    div.appendChild(checkbox);
    div.appendChild(label);

    // Append the div to the form
    formValidated.appendChild(div);
  };

  const returnInBox = () => {
    const formValidated = document.querySelector("#checkbox-container");

    // Create a div with flex style
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center"; // Align items vertically in the center

    // Create the checkbox input
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "ill-box-checkbox";
    checkbox.style.marginLeft = "10px";
    checkbox.style.marginRight = "5px";

    // Create the label
    const label = document.createElement("label");
    label.style.fontSize = "1.5em";
    label.htmlFor = "ill-box-checkbox";
    label.appendChild(
      document.createTextNode("ILL should be returned in a box")
    );

    // Append checkbox and label to the div
    div.appendChild(checkbox);
    div.appendChild(label);

    // Append the div to the form
    formValidated.appendChild(div);
  };

  // Creates a highlighted box to contain the two new checkboxes
  const createCheckboxContainer = () => {
    const formValidated = document.querySelector(".form-validated");
    const checkboxContainer = document.createElement("div");
    checkboxContainer.id = "checkbox-container";
    checkboxContainer.style.backgroundColor = "#f0f0f0";
    checkboxContainer.style.padding = "10px";
    checkboxContainer.style.borderRadius = "5px";
    checkboxContainer.style.display = "flex";
    checkboxContainer.style.justifyContent = "center";
    checkboxContainer.style.alignItems = "center";
    checkboxContainer.style.flexDirection = "column";
    formValidated.appendChild(checkboxContainer);
    addCheckbox();
    returnInBox();
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
