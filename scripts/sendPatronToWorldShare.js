(async () => {
  const { waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );
  const { createMiniModal } = await import(
    chrome.runtime.getURL("modules/modals.js")
  );

  /**
   * Sets the value of an input element and dispatches necessary events
   * @param {string} element CSS selector for the input element
   * @param {string} value Value to set
   */
  const setInputValue = (element, value) => {
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
  };

  const extractPatronDetails = async () => {
    const requestManagerSelectors = {
      patronNameField: "div.modal-body.form-validated > div",
      pickupLocationField:
        "body > ngb-modal-window > div > div > div.modal-body.form-validated > div:nth-child(8) > div:nth-child(2)",
    };

    const patronNameField = document
      .querySelector(requestManagerSelectors.patronNameField)
      ?.children[1]?.textContent?.trim();

    if (!patronNameField) {
      createMiniModal(
        "Couldn't find patron info on this page.<br /><strong>Please run this when a request is open in the Evergreen client.</strong>",
        true
      );
      return;
    }

    const patronName = patronNameField.split(" (")[0].trim();
    const barcode = patronNameField.match(/\((\d+)\)/)[1];

    const pickupLocation = document
      .querySelector(requestManagerSelectors.pickupLocationField)
      .textContent.split("(")[1]
      .split(")")[0]
      .trim();
    const worldShareName = patronName + ", " + pickupLocation;

    createMiniModal(`Sending patron info to WorldShare`);

    // Stores name and barcode in local storage
    chrome.storage.local.set(
      { requestManagerPatron: { name: worldShareName, barcode } },
      () => {
        pastePatronToWS();
      }
    );
  };

  const pastePatronToWS = async () => {
    const nameSelector = "#patron-details-NEW-REQUESTER-patronName";
    const barcodeSelector = "#patron-details-NEW-REQUESTER-patronId";

    // TODO: Move these to constants
    // ******************************************************
    // * Alternate Selectors for Updated WorldShare Version *
    // ******************************************************
    // const nameSelector = 'input[name="patron.name"]';
    // const barcodeSelector = 'input[name="patron.userId"]';
    // Find input with name attribute of "patron.name"
    // const nameInput = document.querySelector('input[name="patron.name"]');

    // Check if we're on the right page
    if (!window.location.href.includes("share.worldcat.org")) {
      // Find the correct tab
      chrome.runtime.sendMessage({
        type: "findAndSwitchToWorldShare",
        scriptToRelaunch: "sendPatronToWorldShare",
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

    // Wait for the name and barcode fields to be available
    const nameField = await waitForElementWithInterval(nameSelector);
    const barcodeField = await waitForElementWithInterval(barcodeSelector);

    if (!nameField || !barcodeField) {
      createMiniModal("Could not find patron fields on WorldShare — is a request open?", true);
      return;
    }

    // Scroll to nameSelector field
    nameField.scrollIntoView({ behavior: "smooth", block: "center" });

    // Use helper function to set values for patron information and dispatch events
    setInputValue(nameField, patronName);
    setInputValue(barcodeField, barcode);

    createMiniModal(
      `Patron information pasted: <p><small>${patronName}</small><br /><small>${barcode}</small></p>`
    );

    // Removes requestManagerPatron from storage after use to keep things fresh
    chrome.storage.local.remove("requestManagerPatron");
  };

  // If the script is running in the Request Manager modal, extract patron details
  if (window.location.href.includes("eg2/en-US/staff/cat/requests")) {
    extractPatronDetails();
  }
  // If the script is running in WorldShare, paste patron details
  else if (window.location.href.includes("share.worldcat.org")) {
    pastePatronToWS();
  } else {
    console.error(
      "This script should only run in Request Manager or WorldShare pages."
    );
  }
})();
