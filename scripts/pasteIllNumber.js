(async () => {
  const { waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  const storageData = await new Promise((resolve) => {
    chrome.storage.local.get("pendingIllNumber", resolve);
  });

  const illNumber = storageData.pendingIllNumber;
  if (!illNumber) {
    console.error("[pasteIllNumber] No pending ILL number found in storage");
    return;
  }

  const findIllInput = () => {
    const labelDivs = document.querySelectorAll("div.col-2");
    for (const labelDiv of labelDivs) {
      if (labelDiv.textContent.trim() === "ILL #") {
        const col4 = labelDiv.nextElementSibling;
        if (!col4 || !col4.classList.contains("col-4")) continue;
        const input = col4.querySelector("input");
        if (input) return input;
      }
    }
    return null;
  };

  const illInput = await waitForElementWithInterval(findIllInput);
  if (!illInput) {
    console.error("[pasteIllNumber] Could not find ILL # input field");
    return;
  }

  illInput.value = illNumber;
  illInput.dispatchEvent(new Event("input", { bubbles: true }));
  illInput.dispatchEvent(new Event("change", { bubbles: true }));
  illInput.dispatchEvent(new Event("blur", { bubbles: true }));

  chrome.storage.local.remove("pendingIllNumber");
})();
