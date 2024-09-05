function pasteToEvergreen() {
  const updateInputField = (selector, value, prefix = "") => {
    const inputField = document.querySelector(selector);
    inputField.value = prefix + value;
    const event = new Event("input", {
      bubbles: true,
      cancelable: true,
    });
    inputField.dispatchEvent(event);
  };

  const updateTitle = (title) => {
    updateInputField("#title-input", title, "ILL Title - ");
  };

  const updateCallNumber = (requestNumber) => {
    updateInputField("#callnumber-input", requestNumber, "IL");
  };

  const updatePatronBarcode = (patronID) => {
    updateInputField("#patron-barcode-input", patronID);
  };

  const updatePatronAddress = (addressString) => {
    const inputField = document.querySelector("textarea");
    const bagText = "**BAG**\n";
    const boxText = "**RETURN IN BOX**\n";
    if (inputField.value.includes(bagText)) {
      addressString = bagText + addressString;
    }
    if (inputField.value.includes(boxText)) {
      addressString = boxText + addressString;
    }
    updateInputField("textarea", addressString);
  };

  const extractArrayFromLocalStorage = () => {
    chrome.storage.local.get("requestData", (result) => {
      if (!result.requestData) {
        statusModal(
          "Couldn't find any data to paste! Try copying from the WorldShare request again. If the error persists, please contact Jason."
        );
        return;
      } else {
        const { addressString, requestNumber, title, patronID, isLendingFee } =
          JSON.parse(result.requestData);
        updateTitle(title);
        updateCallNumber(requestNumber);
        updatePatronBarcode(patronID);
        updatePatronAddress(addressString);
        if (isLendingFee !== "0.00" && isLendingFee !== "") {
          alert(
            `This request might have a lending fee of $${isLendingFee}. Please verify and add it to the patron's record.`
          );
        }
        // TODO: Seems impossible to focus on the item barcode from sidebar but functions as expected with keyboard shortcut?
        const kclsBarcodeInput = document.querySelector("#item-barcode-input");
        kclsBarcodeInput.focus();
      }
    });
  };

  // TODO: Finish implementing an error modal for when the data is not found in local storage

  const statusModal = (err) => {
    let imgURL = chrome.runtime.getURL("images/kawaii-book-sad.png");
    let headerColor = "#e85e6a";
    let result = `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Error</h2> <p style="font-size: 1rem;">${err}</p>`;
    const modal = document.createElement("div");
    modal.setAttribute("id", "modal");
    const modalStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      borderRadius: "1rem",
      zIndex: "1000",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      color: "#000",
      fontSize: "4rem",
      border: "1px solid #000",
      boxShadow: "0 0 10px 5px #000",
    };
    for (const [key, value] of Object.entries(modalStyle)) {
      modal.style[key] = value;
    }

    modal.innerHTML = `
    <div>  
      <div style="background-color: ${headerColor}; padding: 1rem; border-radius: 1rem 1rem 0 0; text-align: center;">
        <img src=${imgURL} style="width: 100px; height: 100px; border-radius: 50%;">
      </div>
      <div style="background-color: #f9f9f9;  text-align: center; border-radius: 0 0 1rem 1rem; padding: 1rem;">
        ${result}
      </div>
    </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => {
      modal.remove();
    }, 3000);
  };

  // TODO: Pressing enter seems to submit the form, which I don't think is the demonstrated behavior on local client
  // document.addEventListener("keydown", (e) => {
  //   if (e.key === "Enter") {
  //     const buttons = document.querySelectorAll("button");
  //     buttons.forEach((button) => {
  //       if (button.textContent === "Create Item") {
  //         button.focus();
  //       }
  //     });
  //   }
  // });

  extractArrayFromLocalStorage();
}
pasteToEvergreen();
