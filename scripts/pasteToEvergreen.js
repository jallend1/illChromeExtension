function pasteToEvergreen() {
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

  // const extractArrayFromClipboard = () => {
  //   navigator.clipboard.readText().then((text) => {
  //     const array = JSON.parse(text);
  //     updateTitle(array[2].title);
  //     updateCallNumber(array[1].requestNumber);
  //     updatePatronBarcode(array[3].patronID);
  //     updatePatronAddress(array[0].addressString);
  //     const kclsBarcodeInput = document.querySelector('#item-barcode-input');
  //     kclsBarcodeInput.focus();
  //     console.log(array);
  //   });
  // };

  const extractArrayFromLocalStorage = () => {
    chrome.storage.local.get("requestData", (result) => {
      if (!result.requestData) {
        console.log("No data to paste!");
        return;
      } else {
        let storageData = JSON.parse(result.requestData);
        // const array = JSON.parse(localStorage.getItem("clipboardData"));
        console.log(storageData);
        updateTitle(storageData[2].title);
        updateCallNumber(storageData[1].requestNumber);
        updatePatronBarcode(storageData[3].patronID);
        updatePatronAddress(storageData[0].addressString);
        const kclsBarcodeInput = document.querySelector("#item-barcode-input");
        kclsBarcodeInput.focus();
      }
    });
  };

  // extractArrayFromClipboard();
  extractArrayFromLocalStorage();
}
pasteToEvergreen();
