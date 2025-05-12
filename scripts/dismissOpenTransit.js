(async () => {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );
  const { waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  const HOLDSREGEX = /\(\d+\s*\/\s*(\d+)\)/;
  let holdCount = null;
  let listeningForBarcode = false;
  const miniModalStyles = {
      position: "fixed",
      top: "5%",
      right: "0%",
      zIndex: "9999",
      background: "linear-gradient(135deg, #b7f8db 0%, #50e3c2 100%)",
      padding: "20px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
      borderRadius: "8px",
      color: "#333",
      transition: "opacity 0.3s ease-in-out",
      opacity: "1",
    }

  // -- Displays a mini-modal saying Open Transit dialog is being dismissed --
  function createMiniModal() {
    const existingModal = document.querySelector(".mini-modal");
  if (existingModal) {
    existingModal.remove(); // Remove the existing modal
  }
    const miniModal = document.createElement("div");
    miniModal.className = "mini-modal";
    miniModal.innerHTML = `
      <div class="mini-modal-content">
        <p>Dismissed open transit dialog.</p>
      </div>
    `;
    Object.assign(miniModal.style, miniModalStyles);
    document.body.appendChild(miniModal);
    setTimeout(() => {
        miniModal.remove();
      }, 2000);
  }

  // -- Dismisses open transit modal --
 async function dismissOpenTransit() {
  const modal = document.querySelector(".modal-body");
  if (!modal || !modal.textContent.includes("open transit on item")) return;
  const modalFooterButton = await waitForElementWithInterval(
    ".modal-footer button");
  if (modalFooterButton) {
    modalFooterButton.click();
    createMiniModal();
  }
}

  // -- Handles changes to holds field count --
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

  // -- Extracts number from the holds field --
  function extractHoldsCount(str) {
    const match = str.match(HOLDSREGEX);
    return match ? parseInt(match[1]) : null;
  }

  // -- Mutation Observer callback function --
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // If mutation is childList, check if the added node has a class of "modal-body"
      if (mutation.type === "childList") {
        const addedNodes = Array.from(mutation.addedNodes);
        addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const modalBody = node.querySelector(".modal-body");
            if (modalBody && modalBody.textContent.includes("open transit on item")) {
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

  // -- Keydown listener on barcode input to listen for holds changes --
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

  // -- Mutation observer to watch for changes in the holds field --
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
