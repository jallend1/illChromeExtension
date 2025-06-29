(async () => {
  const { waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  const nameSelector = "#patron-details-NEW-REQUESTER-patronName";
  const barcodeSelector = "#patron-details-NEW-REQUESTER-patronId";

  let patronName;
  let barcode;
  // Extract requestManagerPatron from local storage
  chrome.storage.local.get("requestManagerPatron", (data) => {
    if (data.requestManagerPatron) {
      patronName = data.requestManagerPatron.name;
      barcode = data.requestManagerPatron.barcode;
      console.log("Request Manager Patron loaded from storage:", {
        name: patronName,
        barcode: barcode,
      });
    }
  });

  // Wait for the name and barcode fields to be available
  const nameField = await waitForElementWithInterval(nameSelector);
  const barcodeField = await waitForElementWithInterval(barcodeSelector);

  // TODO: If there's no nameFieldTest, switch to WorldShare tab and try again
  // const nameFieldTest = document.querySelector(nameSelector);
  // console.log("Name field test:", nameFieldTest);
  // if(!nameFieldTest) {
  //     const tabs = await chrome.tabs.query({ url: "*share.worldcat.org/*" });
  //     if (tabs.length > 0) {
  //         chrome.tabs.update(tabs[0].id, { active: true });
  //     }
  // }

  // Scroll to nameSelector field
  nameField.scrollIntoView({ behavior: "smooth", block: "center" });

  // Fill in the name and barcode fields
  nameField.value = patronName;
  barcodeField.value = barcode;
})();
