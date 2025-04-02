console.log("Dismiss open transit script loaded!");

(async () => {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );
  let holdCount;
  // let itemsOut;

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

  const itemsOutRegex = /(?<=\()\d+(?=\))/;
  const holdsRegex = /\(\d+\s*\/\s*(\d+)\)/;

  const observer = new MutationObserver((mutations) => {
    const filteredMutations = mutations.filter(
      (mutation) => mutation.type === "characterData"
    );

    filteredMutations.forEach((mutation) => { 
      if(mutation.target.textContent.includes("Holds") && !holdCount) {
        // Set the initial value of holdCount
        const holdsField = document.querySelector("[ngbnavitem='holds'] > a");
        if (holdsField) {
          holdCount = parseInt(holdsField.textContent.match(holdsRegex)[1]); // Extracts the number in parentheses in nav field
          console.log("Initial holds count:", holdCount);
        }
        
      }
        // console.log(mutation);
    if (listeningForBarcode && mutation.oldValue.includes("Holds")) {
          const oldValue = parseInt(mutation.oldValue.match(holdsRegex)[1]); // Extracts the number in parentheses in nav field
          const currentText = mutation.target.textContent.trim();
          const currentValue = parseInt(currentText.match(holdsRegex)[1]); // Extracts the number in parentheses in nav field
          if (currentValue === 0) {
            // If the old value is not zero, set the stored holdCount to the old value
            if (oldValue !== 0) {
              holdCount = oldValue;
            }
            // If not, ignore the transitional mutation
            return;
          }
          else {
            // If stored hold variable is zero, set the value to current mutation
            if (holdCount === 0) {
              holdCount = currentValue;
              console.log("Holds count set to current value from 0:", holdCount);
            }
            else if (currentValue === holdCount) {
              console.error(
                "Current value is the same as the old value!"
              );
              statusModal(
                `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Error!</h2> <p style="font-size: 1rem;">Holds didn't seem to have decreased!</p>`,
                "#e85e6a",
                chrome.runtime.getURL("images/kawaii-book-sad.png")
              );
            }
            else if (currentValue < holdCount){
              console.log("Holds decreased from", holdCount, "to", currentValue, "Expected behavior!!");
              // Updates hold count to the new value for the next checkout
              holdCount = currentValue;
            }
          }
        }
    });

    dismissOpenTransit();
    // monitorInput();
  });

  let listeningForBarcode = false;

  function monitorInput() {
    const barcodeInput = document.querySelector("#barcode-input");
    if (barcodeInput && !barcodeInput.dataset.listenerAdded) {
      barcodeInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          console.log("Enter has been pressed!");
          listeningForBarcode = true;
        }
      });
      barcodeInput.dataset.listenerAdded = true;
    }
  }

  const attachMutationObservers = () => {
    const holdsField = document.querySelector("[ngbnavitem='holds'] > a");
    // const itemsOutField = document.querySelector(
    //   "[ngbnavitem='items_out'] > a"
    // );
    // if (holdsField) console.log(holdsField.textContent);
    // if (itemsOutField) console.log(itemsOutField.textContent);

    if (holdsField && !holdsField.dataset.observerAdded) {
      // Adds observer to the text node (first child)
      observer.observe(holdsField.firstChild, {
        characterData: true,
        characterDataOldValue: true,
      });
      holdsField.dataset.observerAdded = true; // Adds the observer just the one time
    }
    // if (itemsOutField && !itemsOutField.dataset.observerAdded) {
    //   // Adds observer to the text node (first child)
    //   observer.observe(itemsOutField.firstChild, {
    //     characterData: true,
    //     characterDataOldValue: true,
    //   });
    //   itemsOutField.dataset.observerAdded = true; // Adds the observer just the one time
    // }
  };

  const assignInitialValues = () => {
    const holdsField = document.querySelector("[ngbnavitem='holds'] > a");
    // const itemsOutField = document.querySelector(
    //   "[ngbnavitem='items_out'] > a"
    // );
    if (holdsField) {
      holdCount = parseInt(holdsField.textContent.match(holdsRegex)[1]); // Extracts the number in parentheses in nav field
      console.log("Initial holds count:", holdCount);
    }
    // if (itemsOutField) {
    //   itemsOut = parseInt(itemsOutField.textContent.match(itemsOutRegex)[0]); // Extracts the number in parentheses in nav field
    //   console.log("Initial items out count:", itemsOut);
    // }
  };

  // assignInitialValues();
  attachMutationObservers();

  // 2 ) If enter is pressed, check if the number of holds went down by 1
  monitorInput();

  // 3) If not, throw an error modal indicating as much
  // if ((err = true)) {
    // statusModal(
    //   `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Error!</h2> <p style="font-size: 1rem;">Holds didn't seem to have decreased!</p>`,
    //   "#e85e6a",
    //   chrome.runtime.getURL("images/kawaii-book-sad.png")
    // );
  // }

  // TODO: More narrowly focus this for the modal specifically
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("beforeunload", () => {
    observer.disconnect();
  });
})();
