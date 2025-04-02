console.log("Dismiss open transit script loaded!");

(async () => {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );
  let holdCount;
  let itemsOut;

  function dismissOpenTransit() {
    const modal = document.querySelector(".modal-body");

    if (!modal) {
      return;
    }

    const modalText = modal.textContent;

    if (modalText.includes("open transit on item")) {
      console.log("Found open transit modal, dismissing it.");
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
      if (listeningForBarcode) {
        // console.log(mutation);
        if (mutation.oldValue.includes(" Items Out")) {
          const oldValue = parseInt(mutation.oldValue.match(itemsOutRegex)[0]); // Extracts the number in parentheses in nav field
          const currentText = mutation.target.textContent.trim();
          const latestValue = parseInt(currentText.match(itemsOutRegex)[0]); // Extracts the number in parentheses in nav field
          // Check if latestValue is higher than itemsOut
          if (latestValue !== 0) {
            // console.log("Current items out value:", latestValue);
            // console.log(`Items out value`, itemsOut);
            // console.log("Old value:", oldValue);
            // Check if latestValue is greater than itemsOut
            if (latestValue > itemsOut) {
              // console.log(
              //   "Items out value increased from",
              //   itemsOut,
              //   "to",
              //   latestValue
              // );
              itemsOut = latestValue;
            }
          }
          // On update, Evergreen briefly sets items out to zero regardless of
          // how many items are actually out before populating it with the new value
          // Probably just ignore this period?
          if (latestValue < oldValue) {
            return;
          }
          if (latestValue > oldValue) {
            // console.log("Done resetting, probably");
            // console.log("Current value:", latestValue);
            if (itemsOut !== latestValue) {
              // console.log(
              //   "Items out changed from",
              //   itemsOut,
              //   "to",
              //   latestValue
              // );
              // itemsOut = latestValue;
            }
          }
        } else if (mutation.oldValue.includes("Holds")) {
          const oldValue = parseInt(mutation.oldValue.match(holdsRegex)[1]); // Extracts the number in parentheses in nav field
          const currentText = mutation.target.textContent.trim();
          const currentValue = parseInt(currentText.match(holdsRegex)[1]); // Extracts the number in parentheses in nav field
          console.log("Current holds value:", currentValue);
          // Ignore if the current value is zero because it's resetting
          if (currentValue === 0) {
            if (oldValue !== 0) {
              console.log("current value is zero, setting hold count to old value");
              holdCount = oldValue;
              console.log("Hold count set to old value:", holdCount);
            }
            // console.log("Holds are zero, ignoring this mutation.");
            // console.log("Old value:", oldValue);
            // console.log("Hold count:", holdCount);
            return;
          }
          else {
            // If holdsCount is zero, set the value to current mutation
            if (holdCount === 0) {
              holdCount = currentValue;
              console.log("Holds count set to current value from 0:", holdCount);
            }
            else if (currentValue === holdCount) {
              console.error(
                "Current value is the same as the old value!"
              );
            }
            else if (currentValue < holdCount){
              console.log("Holds decreased from", holdCount, "to", currentValue, "Expected behavior!!");
              // Updates hold count to the new value for the next checkout
              holdCount = currentValue;
            }


          }
          // if (currentValue < oldValue) {
          //   console.log("Holds decreased from", oldValue, "to", currentValue);
          //   if (holdCount !== currentValue) {
          //     console.log(
          //       "Holds count changed from",
          //       holdCount,
          //       "to",
          //       currentValue
          //     );
          //     holdCount = currentValue;
          //   }
          // }
        }
      }
      // else if (mutation.type === "characterData") {
      //   if (mutation.target.textContent.includes("Items Out")) {
      //     const currentText = mutation.target.textContent.trim();
      //     const currentValue = currentText.match(itemsOutRegex)[0]; // Extracts the number in parentheses in nav field
      //     // console.log(currentValue);
      //     itemsOut = currentValue;
      //   }
      //   if (mutation.target.textContent.includes("Holds")) {
      //     const currentText = mutation.target.textContent.trim();
      //     const currentValue = currentText.match(holdsRegex)[1]; // Extracts the number in parentheses in nav field
      //     // console.log(currentValue);
      //     holdCount = currentValue;
      //   }
      //   console.log("Character data changed:", mutation.target.textContent);
      //   console.log("old value:", mutation.oldValue);
      // }
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
    const itemsOutField = document.querySelector(
      "[ngbnavitem='items_out'] > a"
    );
    if (holdsField) console.log(holdsField.textContent);
    if (itemsOutField) console.log(itemsOutField.textContent);

    if (holdsField && !holdsField.dataset.observerAdded) {
      // Adds observer to the text node (first child)
      observer.observe(holdsField.firstChild, {
        characterData: true,
        characterDataOldValue: true,
      });
      holdsField.dataset.observerAdded = true; // Adds the observer just the one time
    }
    if (itemsOutField && !itemsOutField.dataset.observerAdded) {
      // Adds observer to the text node (first child)
      observer.observe(itemsOutField.firstChild, {
        characterData: true,
        characterDataOldValue: true,
      });
      itemsOutField.dataset.observerAdded = true; // Adds the observer just the one time
    }
  };

  const assignInitialValues = () => {
    const holdsField = document.querySelector("[ngbnavitem='holds'] > a");
    const itemsOutField = document.querySelector(
      "[ngbnavitem='items_out'] > a"
    );
    if (holdsField) {
      holdCount = parseInt(holdsField.textContent.match(holdsRegex)[1]); // Extracts the number in parentheses in nav field
      console.log("Initial holds count:", holdCount);
    }
    if (itemsOutField) {
      itemsOut = parseInt(itemsOutField.textContent.match(itemsOutRegex)[0]); // Extracts the number in parentheses in nav field
      console.log("Initial items out count:", itemsOut);
    }
  };

  assignInitialValues();
  attachMutationObservers();

  // 2 ) If enter is pressed, check if the number of holds went down by 1
  monitorInput();

  // 3) If not, throw an error modal indicating as much
  // if ((err = true)) {
  //   statusModal(
  //     `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Error!</h2> <p style="font-size: 1rem;">Holds didn't seem to have decreased!</p>`,
  //     "#e85e6a",
  //     chrome.runtime.getURL("images/kawaii-book-sad.png")
  //   );
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
