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
        if (isLendingFee !== "0.00" && isLendingFee !== "") {
          alert(
            `This request might have a lending fee of $${isLendingFee}. Please verify and add it to the patron's record.`
          );
        }
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

  extractArrayFromLocalStorage();
}
pasteToEvergreen();
