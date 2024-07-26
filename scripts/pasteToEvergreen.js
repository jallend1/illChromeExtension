function pasteToEvergreen() {
  // TODO: Consolidate all this duplicative work into a single function

  const updateTitle = (title) => {
    const titleInput = document.querySelector("#title-input");
    titleInput.value = "ILL Title - " + title;
    const event = new Event("input", {
      bubbles: true,
      cancelable: true,
    });
    titleInput.dispatchEvent(event);
  };

  const updateCallNumber = (requestNumber) => {
    const callNumberInput = document.querySelector("#callnumber-input");
    callNumberInput.value = "IL" + requestNumber;
    const event = new Event("input", {
      bubbles: true,
      cancelable: true,
    });
    callNumberInput.dispatchEvent(event);
  };

  const updatePatronBarcode = (patronID) => {
    const patronBarcodeInput = document.querySelector("#patron-barcode-input");
    patronBarcodeInput.value = patronID;
    const event = new Event("input", {
      bubbles: true,
      cancelable: true,
    });
    patronBarcodeInput.dispatchEvent(event);
  };

  const updatePatronAddress = (addressString) => {
    const addressInput = document.querySelector("textarea");
    addressInput.value = addressString;
    const event = new Event("input", {
      bubbles: true,
      cancelable: true,
    });
    addressInput.dispatchEvent(event);
  };

  const lendingFeeAlertModal = () => {
    const lendingFeeAlert = document.createElement("div");
    lendingFeeAlert.id = "lending-fee-alert";
    lendingFeeAlert.innerHTML = `
      <div id="lending-fee" class="alert alert-danger" role="alert">
        <strong>Warning:</strong> This request may have a lending fee. If so, don't forget to add it to the patron record.
        <button type="button" class="btn-close" aria-label="Close">x</button>
      </div>
    `;
    document.body.appendChild(lendingFeeAlert);
    const closeButton = document.querySelector(".btn-close");
    closeButton.addEventListener("click", closeAlert);
    // Automatically close the alert after 10 seconds
    setTimeout(() => {
      closeAlert();
    }, 10000);
  };

  const closeAlert = () => {
    const alert = document.querySelector("#lending-fee");
    alert.remove();
  };

  const extractArrayFromLocalStorage = () => {
    chrome.storage.local.get("requestData", (result) => {
      if (!result.requestData) {
        console.log("No data to paste!");
        return;
      } else {
        let storageData = JSON.parse(result.requestData);
        updateTitle(storageData[2].title);
        updateCallNumber(storageData[1].requestNumber);
        updatePatronBarcode(storageData[3].patronID);
        updatePatronAddress(storageData[0].addressString);
        // TODO: Seems impossible to focus on the item barcode from sidebar
        // But functions as expected with keyboard shortcut?
        console.log(storageData[4].isLendingFee);
        if (storageData[4].isLendingFee === true) {
          lendingFeeAlertModal();
        }
        const kclsBarcodeInput = document.querySelector("#item-barcode-input");
        kclsBarcodeInput.focus();
      }
    });
  };

  extractArrayFromLocalStorage();
}
pasteToEvergreen();
