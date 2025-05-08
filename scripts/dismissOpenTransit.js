console.log("Dismiss open transit script loaded!");

(async () => {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );
  let holdCount;

  function dismissOpenTransit() {
    const modal = document.querySelector(".modal-body");

    if (!modal) {
      return;
    }

    const modalText = modal.textContent;

    if (modalText.includes("open transit on item")) {
      const modalFooterButton = document.querySelector(".modal-footer button");
      if (modalFooterButton) modalFooterButton.click();
    }
  }

  const holdsRegex = /\(\d+\s*\/\s*(\d+)\)/;

  const observer = new MutationObserver((mutations) => {
    const filteredMutations = mutations.filter(
      (mutation) => mutation.type === "characterData"
    );

    filteredMutations.forEach((mutation) => {
      if (listeningForBarcode) {
        const oldValue = parseInt(mutation.oldValue.match(holdsRegex)[1]); // Extracts the number in parentheses in nav field
        const currentText = mutation.target.textContent.trim();
        const currentValue = parseInt(currentText.match(holdsRegex)[1]); // Extracts the number in parentheses in nav field
        if (currentValue === 0) {
          // If the old value is not zero, set the stored holdCount to the old value
          if (oldValue !== 0) holdCount = oldValue;
          // If not, ignore the transitional mutation
          return;
        } else {
          // If stored hold variable is zero, set the value to current mutation
          if (holdCount === 0) {
            holdCount = currentValue;
          } else if (currentValue === holdCount) {
            console.warn("Current value is the same as the old value!");
            statusModal(
              "Error!",
              "The number of holds on this card didn't seem to go down with that last checkout. Verify the most recently checked out item is intended for this library system.",
              "#e85e6a",
              chrome.runtime.getURL("images/kawaii-book-sad.png")
            );
          } else if (currentValue < holdCount) {
            // Updates hold count to the new value for the next checkout
            holdCount = currentValue;
          }
        }
      } else if (!holdCount) {
        // Set the initial value of holdCount
        const holdsField = document.querySelector("[ngbnavitem='holds'] > a");
        if (holdsField) {
          holdCount = parseInt(holdsField.textContent.match(holdsRegex)[1]); // Extracts the number in parentheses in nav field
        }
      }
    });

    dismissOpenTransit();
  });

  let listeningForBarcode = false;

  function monitorInput() {
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

  // 2 ) If enter is pressed, check if the number of holds went down by 1
  monitorInput();

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("beforeunload", () => {
    observer.disconnect();
  });
})();
