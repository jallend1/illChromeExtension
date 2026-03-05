(async () => {
  const { waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  const storageData = await new Promise((resolve) => {
    chrome.storage.local.get("lendingPostalCode", resolve);
  });

  const postalCode = storageData.lendingPostalCode;
  if (!postalCode) {
    console.error("No lending postal code found in storage");
    return;
  }

  // Trigger F4 to navigate to Patron Search
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "F4",
      code: "F4",
      keyCode: 115,
      which: 115,
      bubbles: true,
      cancelable: true,
    }),
  );

  const postCodeInput = await waitForElementWithInterval(
    '[aria-label="Post Code"]',
  );
  if (!postCodeInput) {
    console.error("Could not find Post Code input field");
    return;
  }

  postCodeInput.value = postalCode;
  postCodeInput.dispatchEvent(new Event("input", { bubbles: true }));
  postCodeInput.dispatchEvent(new Event("change", { bubbles: true }));
  postCodeInput.dispatchEvent(new Event("blur", { bubbles: true }));

  chrome.storage.local.remove("lendingPostalCode");
})();
