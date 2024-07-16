// TODO: Set up error modal handling

function illReceipt() {
  const requestDataInput = document.getElementById("requestData");
  const submitButton = document.getElementById("submit");
  chrome.storage.local.get("requestData", (result) => {
    if (!result.requestData) {
      console.log("No data to paste!");
      return;
    } else {
      const storageData = result.requestData;
      requestDataInput.value = storageData;
      const event = new Event("input", { bubbles: true });
      requestDataInput.dispatchEvent(event);
      submitButton.click();
    }
  });
}

illReceipt();
