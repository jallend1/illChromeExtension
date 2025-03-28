(() => {
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
    console.log(mutations);
    dismissOpenTransit();
    monitorInput();
  });

  // function monitorInput() {
  //   const barcodeInput = document.querySelector("#barcode-input");
  //   if (barcodeInput && !barcodeInput.dataset.listenerAdded) {
  //     barcodeInput.addEventListener("keydown", (e) => {
  //       const holdsCountText =
  //         document.querySelector("#ngb-nav-2")?.textContent;
  //       console.log(holdsCountText);
  //       if (holdsCountText) {
  //         const match = holdsCountText.match(/\(\d+\s*\/\s*(\d+)\)/);
  //         if (match) {
  //           const secondNumber = match[1];

  //           barcodeInput.dataset.totalHolds = secondNumber;
  //           console.log("Total holds should be:", secondNumber);
  //         }
  //       }
  //       if (e.key === "Enter") {
  //         console.log("Enter is pressed");
  //       }
  //     });
  //     barcodeInput.dataset.listenerAdded = true;
  //   }
  // }

  // TODO: What am I doing.
  // 1) Observe mutations Items Out and Holds fields
  const holdsField = document.querySelector("[ngbnavitem='holds'] > a");
  const itemsOutField = document.querySelector("[ngbnavitem='items_out'] > a");
  console.log(holdsField.textContent);
  console.log(itemsOutField.textContent);

  observer.observer(holdsField, {
    characterData: true,
  });

  observer.observe(itemsOutField, {
    characterData: true,
  });

  // 2) When Items Out goes up, check if the number of holds went down by 1
  // 3) If not, throw an error modal indicating as much

  // const barcodeInput = document.querySelector("#barcode-input");

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("beforeunload", () => {
    observer.disconnect();
  });
})();
