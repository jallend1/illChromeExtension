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

  const observer = new MutationObserver(() => {
    dismissOpenTransit();
    monitorInput();
  });

  function monitorInput() {
    const barcodeInput = document.querySelector("#barcode-input");
    if (barcodeInput && !barcodeInput.dataset.listenerAdded) {
      barcodeInput.addEventListener("keydown", (e) => {
        const holdsCountText =
          document.querySelector("#ngb-nav-2")?.textContent;
        console.log(holdsCountText);
        if (holdsCountText) {
          const match = holdsCountText.match(/\(\d+\s*\/\s*(\d+)\)/);
          if (match) {
            const secondNumber = match[1];

            barcodeInput.dataset.totalHolds = secondNumber;
            console.log("Total holds should be:", secondNumber);
          }
        }
        if (e.key === "Enter") {
          console.log("Enter is pressed");
        }
      });
      barcodeInput.dataset.listenerAdded = true;
    }
  }

  // TODO: What am I doing.
  // 1) Keep track of the number of holds in the holds field #ngb-nav-2.textContent
  // 2) Track mutations on the list of currently checked out items -- New children in childlist of .eg-grid-body
  // 3) When the list of currently checked out items goes up, check if the number of holds went down by 1
  // 4) If so, then we know that the user checked out an item with a hold on it (Success!)
  // 5) If it didn't go down, populate an error modal indicating so

  const barcodeInput = document.querySelector("#barcode-input");
  console.log(barcodeInput);

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("beforeunload", () => {
    observer.disconnect();
  });
})();
