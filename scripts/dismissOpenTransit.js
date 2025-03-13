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

dismissOpenTransit();
