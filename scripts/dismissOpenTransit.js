(async () => {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );

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

  const observer = new MutationObserver((mutations) => {
    // console.log(mutations);
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData" && listeningForBarcode) {
        console.dir(mutation);
        if (mutation.oldValue.includes(" Items Out")) {
          const oldValue = mutation.oldValue.match(/(?<=\()\d+(?=\))/)[0]; // Extracts the number in parentheses in nav field
          const currentText = mutation.target.textContent.trim();
          const currentValue = currentText.match(/(?<=\()\d+(?=\))/)[0]; // Extracts the number in parentheses in nav field

          // On update, Evergreen briefly sets items out to zero regardless of
          // how many items are actually out before populating it with the new value
          // Probably just ignore this period?
          if (currentValue < oldValue) {
            return;
          }
          if (currentValue > oldValue) {
            console.log("Done resetting, probably");
            console.log("Current value:", currentValue);
            console.log("Old value:", oldValue);
          }
        }
      } else if (mutation.type === "characterData") {
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
        // const holdsCountText =
        //   document.querySelector("#ngb-nav-2")?.textContent;
        // console.log(holdsCountText);
        // if (holdsCountText) {
        //   const match = holdsCountText.match(/\(\d+\s*\/\s*(\d+)\)/);
        //   if (match) {
        //     const secondNumber = match[1];

        //     barcodeInput.dataset.totalHolds = secondNumber;
        //     console.log("Total holds should be:", secondNumber);
        //   }
        // }
        if (e.key === "Enter") {
          console.log("Enter is pressed");
          listeningForBarcode = true;
        }
      });
      barcodeInput.dataset.listenerAdded = true;
    }
  }

  // TODO: What in the world am I doing.
  // 1) Observe mutations Items Out and Holds fields
  const holdsField = document.querySelector("[ngbnavitem='holds'] > a");
  const itemsOutField = document.querySelector("[ngbnavitem='items_out'] > a");
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

  // 2 ) If enter is pressed, check if the number of holds went down by 1
  monitorInput();

  // 3) If not, throw an error modal indicating as much
  if ((err = true)) {
    statusModal(
      `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Error!</h2> <p style="font-size: 1rem;">Holds didn't seem to have decreased!</p>`,
      "#e85e6a",
      chrome.runtime.getURL("images/kawaii-book-sad.png")
    );
  }

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("beforeunload", () => {
    observer.disconnect();
  });
})();
