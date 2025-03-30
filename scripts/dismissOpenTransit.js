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
    // TODO: Check the mutation array and see if the holds field AND items out are in the same one
    // console.log(mutations);
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData" && listeningForBarcode) {
        console.log(mutation);
        if (mutation.oldValue.includes(" Items Out")) {
          const oldValue = mutation.oldValue.match(itemsOutRegex)[0]; // Extracts the number in parentheses in nav field
          const currentText = mutation.target.textContent.trim();
          const latestValue = currentText.match(itemsOutRegex)[0]; // Extracts the number in parentheses in nav field

          // On update, Evergreen briefly sets items out to zero regardless of
          // how many items are actually out before populating it with the new value
          // Probably just ignore this period?
          if (latestValue < oldValue) {
            return;
          }
          if (latestValue > oldValue) {
            console.log("Done resetting, probably");
            console.log("Current value:", latestValue);
            if (itemsOut !== latestValue) {
              console.log(
                "Items out changed from",
                itemsOut,
                "to",
                latestValue
              );
              itemsOut = latestValue;
            }
          }
        }
        // if (MutationObserver.oldValue.includes("Holds")) {
        //   // TODO: Global variable tracking hold count up top? Set it to value once it changes from 0 and store it?
        // }
      } else if (mutation.type === "characterData") {
        if (mutation.target.textContent.includes("Items Out")) {
          const currentText = mutation.target.textContent.trim();
          const currentValue = currentText.match(itemsOutRegex)[0]; // Extracts the number in parentheses in nav field
          // console.log(currentValue);
          itemsOut = currentValue;
        }
        if (mutation.target.textContent.includes("Holds")) {
          const currentText = mutation.target.textContent.trim();
          const currentValue = currentText.match(holdsRegex)[1]; // Extracts the number in parentheses in nav field
          // console.log(currentValue);
          holdCount = currentValue;
        }
        console.log("Character data changed:", mutation.target.textContent);
        console.log("old value:", mutation.oldValue);
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
