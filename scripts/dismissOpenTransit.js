(() => {
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

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("beforeunload", () => {
    observer.disconnect();
  });
})();
