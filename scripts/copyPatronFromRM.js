(async () => {
  const patronName = document
    .querySelector("div.modal-body.form-validated > div")
    .children[1].textContent.split("(")[0]
    .trim();
  const pickupLocation = document
    .querySelector(
      "body > ngb-modal-window > div > div > div.modal-body.form-validated > div:nth-child(8) > div:nth-child(2)"
    )
    .textContent.split("(")[1]
    .split(")")[0]
    .trim();
  const worldShareName = patronName + ", " + pickupLocation;
  const patronNameField = document.querySelector(
    "div.modal-body.form-validated > div"
  ).children[1];
  const barcode = patronNameField.textContent.match(/\((\d+)\)/)[1];

  chrome.storage.local.set(
    { requestManagerPatron: { name: worldShareName, barcode } },
    () => {
      //   Alerts sidepanel to update current patron info
      chrome.runtime.sendMessage({ type: "requestManagerPatronUpdated" });
    }
  );

  // TODO: Error handling if elements not found
  // TODO: Ensure data is valid
  // TODO: Automatically initiate pastePatronToWS.js Any reason to not?
})();
