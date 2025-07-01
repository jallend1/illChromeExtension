(async () => {
  const { waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  const nameSelector = "#patron-details-NEW-REQUESTER-patronName";
  const barcodeSelector = "#patron-details-NEW-REQUESTER-patronId";

  // Check if we're on the right page
  if (!window.location.href.includes("share.worldcat.org")) {
    console.log(
      "Not on WorldShare page, finding and switching to WorldShare tab..."
    );
    chrome.runtime.sendMessage({
      type: "findAndSwitchToWorldShare",
      scriptToRelaunch: "pastePatronToWS",
    });
    return; // Don't wait for a response!
  }

  const storageData = await new Promise((resolve) => {
    chrome.storage.local.get("requestManagerPatron", resolve);
  });

  if (!storageData.requestManagerPatron) {
    console.error("No patron data found in storage");
    return;
  }

  const { name: patronName, barcode } = storageData.requestManagerPatron;
  console.log("Request Manager Patron loaded from storage:", {
    name: patronName,
    barcode: barcode,
  });

  // Wait for the name and barcode fields to be available
  const nameField = await waitForElementWithInterval(nameSelector);
  const barcodeField = await waitForElementWithInterval(barcodeSelector);

  if (!nameField || !barcodeField) {
    console.error("Could not find required fields on WorldShare page");
    return;
  }

  // Scroll to nameSelector field
  nameField.scrollIntoView({ behavior: "smooth", block: "center" });

  // Fill in the name and barcode fields
  nameField.value = patronName;
  barcodeField.value = barcode;
})();
