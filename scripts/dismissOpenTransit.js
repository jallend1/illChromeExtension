(async () => {
  const { statusModal, createMiniModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );
  const { waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  const HOLDSREGEX = /\(\d+\s*\/\s*(\d+)\)/;
  let holdCount = null;
  let listeningForBarcode = false;

  // -- Dismisses open transit modal --
  /**
   * Dismisses the "open transit on item" modal if it appears
   * @returns {Promise<void>}
   */
  async function dismissOpenTransit() {
    const modal = document.querySelector(".modal-body");
    if (!modal || !modal.textContent.includes("open transit on item")) return;
    const modalFooterButton = await waitForElementWithInterval(
      ".modal-footer button"
    );
    if (modalFooterButton) {
      modalFooterButton.click();
      createMiniModal("Dismissed open transit dialog.");
    }
  }

  /**
   * Handles changes to holds field count
   * @param {number} oldValue
   * @param {number} currentValue
   * @returns {void}
   */
  function handleHoldsMutation(oldValue, currentValue) {
    if (currentValue === 0) {
      // If the old value is not zero, set the stored holdCount to the old value (Evergreen has an intermediary state where the value will be 0)
      if (oldValue !== 0) holdCount = oldValue;
      // If the value is 0, ignore this transitional mutation
      return;
    }
    if (!holdCount) {
      // If stored hold variable is zero, set the value to current mutation
      holdCount = currentValue;
    } else if (currentValue === holdCount) {
      // If the current value is the same as the old value, warn the user
      console.warn("Current value is the same as the old value!");
      statusModal(
        "Error!",
        "The number of holds on this card didn't seem to go down with that last checkout. Verify the most recently checked out item is intended for this library system.",
        "#e85e6a",
        chrome.runtime.getURL("images/kawaii-book-sad.png")
      );
    } else if (currentValue < holdCount) {
      // If the current value is less than the stored holdCount, update the holdCount to the new value
      holdCount = currentValue;
    }
  }

  /**
   * Extracts the number of holds from a string.
   * @param {string} str - The string to extract the holds count from.
   * @returns {number|null} - The extracted holds count, or null if not found.
   */

  function extractHoldsCount(str) {
    const match = str.match(HOLDSREGEX);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Sets up mutation observers to monitor changes in the holds field and modal dialogs.
   * Also sets up a keydown listener on the barcode input to trigger holds monitoring.
   * @returns {void}
   */
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // If mutation is childList, check if the added node has a class of "modal-body"
      if (mutation.type === "childList") {
        const addedNodes = Array.from(mutation.addedNodes);
        addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const modalBody = node.querySelector(".modal-body");
            if (
              modalBody &&
              modalBody.textContent.includes("open transit on item")
            ) {
              dismissOpenTransit();
            }
          }
        });
      }
      // if (mutation.type !== "characterData") return; // Ignore non-characterData mutations
      else if (mutation.type === "characterData" && listeningForBarcode) {
        const oldValue = extractHoldsCount(mutation.oldValue || ""); // Extracts the number in parentheses in nav field
        const currentValue = extractHoldsCount(
          mutation.target.textContent.trim()
        );

        if (oldValue !== null && currentValue !== null) {
          handleHoldsMutation(oldValue, currentValue);
        }
      } else if (holdCount === null) {
        // Set the initial value of holdCount
        const holdsField = document.querySelector("[ngbnavitem='holds'] > a");
        if (holdsField) {
          holdCount = extractHoldsCount(holdsField.textContent.trim()); // Extracts the number in parentheses in nav field
        }
      }
    });
  });

  /**
   * Sets up a keydown listener on the barcode input field to monitor for Enter key presses.
   * When Enter is pressed, it sets listeningForBarcode to true.
   * @returns {void}
   */
  function monitorBarcodeInput() {
    const barcodeInput = document.querySelector("#barcode-input");
    if (barcodeInput && !barcodeInput.dataset.listenerAdded) {
      barcodeInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          listeningForBarcode = true;
        }
      });
      barcodeInput.dataset.listenerAdded = true;
    }
  }

  /**
   * Attaches mutation observers to the holds field to monitor changes in its text content.
   * @returns {void}
   */
  const attachMutationObservers = () => {
    const holdsField = document.querySelector("[ngbnavitem='holds'] > a");
    if (holdsField && !holdsField.dataset.observerAdded) {
      // Adds observer to the text node (first child)
      observer.observe(holdsField.firstChild, {
        characterData: true,
        characterDataOldValue: true,
      });
      holdsField.dataset.observerAdded = true; // Adds the observer just the one time
    }
  };

  attachMutationObservers();
  monitorBarcodeInput();

  // TODO: I forget why I'm observing the entire body?
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("beforeunload", () => {
    observer.disconnect();
  });
})();
