(async () => {
  const { waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  const storageData = await new Promise((resolve) => {
    chrome.storage.local.get("lendingPostalCode", resolve);
  });

  const rawPostal = storageData.lendingPostalCode;
  if (!rawPostal) {
    console.error("No lending postal code found in storage");
    return;
  }

  const postalCode = rawPostal.replace(/\D/g, "").slice(0, 5);

  // Only trigger F4 if the patron search form isn't already open
  if (!document.querySelector('[aria-label="Post Code"]')) {
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
  }

  const [postCodeInput, lastNameInput] = await Promise.all([
    waitForElementWithInterval('[aria-label="Post Code"]'),
    waitForElementWithInterval('[aria-label="Last Name"]'),
  ]);

  if (!postCodeInput || !lastNameInput) {
    console.error("Could not find patron search fields");
    return;
  }

  const fill = (input, value) => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("blur", { bubbles: true }));
  };

  fill(postCodeInput, postalCode);
  fill(lastNameInput, "ILL DEPT");

  chrome.storage.local.remove("lendingPostalCode");
})();
