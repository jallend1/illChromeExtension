(async () => {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );

  // TODO: Patron name stored in localStorage but not used in this function yet
  // Use to 1) Verify patron name on Evergreen screen 2) Add patron pickup location
  function pasteToEvergreen() {
    let result = `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Something went wrong!</h2> <p style="font-size: 1rem;">Couldn't find the right spots to insert the request information. Make sure you're on the 'Create ILL Screen.' If the problems continue, contact Jason.</p>`;
    const imgURL = chrome.runtime.getURL("images/kawaii-book-sad.png");
    const headerColor = "#e85e6a";

    const updateInputField = (selector, value, prefix = "") => {
      const inputField = document.querySelector(selector);
      if (!inputField) {
        statusModal(result, headerColor, imgURL);
        return;
      }
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
      const inputField = document.querySelector("textarea");
      if (!inputField) {
        statusModal(result, headerColor, imgURL);
        return;
      }
      const bagText = "**BAG**\n";
      const boxText = "**RETURN IN BOX**\n";
      if (inputField.value.includes(bagText)) {
        addressString = bagText + addressString;
      }
      if (inputField.value.includes(boxText)) {
        addressString = boxText + addressString;
      }
      updateInputField("textarea", addressString);
    };

    const extractArrayFromLocalStorage = () => {
      chrome.storage.local.get("requestData", (result) => {
        if (!result.requestData) {
          result = `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Something went wrong!</h2> <p style="font-size: 1rem;">Couldn't find any data to paste! Try copying from the WorldShare request again. If the error persists, please contact Jason.</p>`;

          statusModal(result, headerColor, imgURL);
          return;
        } else {
          const {
            addressString,
            requestNumber,
            title,
            patronID,
            isLendingFee,
          } = JSON.parse(result.requestData);
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
          const kclsBarcodeInput = document.querySelector(
            "#item-barcode-input"
          );
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
  pasteToEvergreen(statusModal);
})();
