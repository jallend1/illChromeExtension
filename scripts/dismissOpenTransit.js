function dismissOpenTransit() {
  const modalText = document.querySelector(".modal-body").textContent;
  if (modalText.includes("open transit on item")) {
    document.querySelector(".modal-footer button").click();
  }
}

dismissOpenTransit();
