(async () => {
  const { keyboardCowboy } = await import(
    chrome.runtime.getURL("modules/keyboardCowboy.js")
  );

  function holdScreenMods() {
    keyboardCowboy(
      `Press <span style="font-weight:bold;">Ctrl+Enter</span> after entering the patron barcode to submit this hold without ever touching your mouse!`
    );

    // If item has a second patron, automatically populate departmental card barcode
    const placeHoldOnKCLSCard = () => {
      const barcodeField = document.querySelector("#patron-barcode");
      barcodeField.value = "0040746158";
      const event = new Event("input", {
        bubbles: true,
        cancelable: true,
      });
      barcodeField.dispatchEvent(event);
      const placeHoldButton = document.querySelector(
        '[keydesc="Place Hold(s)"]'
      );
      // Watch for disabled attribute to be removed from placeHoldButton
      const observer = new MutationObserver((mutationList) => {
        mutationList.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            !placeHoldButton.hasAttribute("disabled")
          ) {
            placeHoldButton.click();
            observer.disconnect(); // Stop observing once the button is clicked
          }
        });
      });
      observer.observe(placeHoldButton, {
        attributes: true,
        attributeFilter: ["disabled"],
      });
    };

    const handleMutationObserver = (mutationList, observer) => {
      for (const mutation of mutationList) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          const addedNodes = Array.from(mutation.addedNodes);

          // Filter nodes to find relevant alert messages
          const alertNodes = addedNodes.filter(
            (node) =>
              node.classList &&
              node.classList.contains("alert") &&
              node.classList.contains("p-1") &&
              node.classList.contains("ms-2")
          );

          for (const alertNode of alertNodes) {
            // Check for specific hold status messages
            if (
              alertNode.textContent.includes("MAX_HOLDS") ||
              alertNode.textContent.includes("HOLD_EXISTS")
            ) {
              let infoButtons = document.querySelectorAll(".btn.btn-info");

              // Retry if only one button is available
              if (infoButtons.length === 1) {
                let counter = 0;
                const interval = setInterval(() => {
                  counter++;
                  const updatedInfoButtons =
                    document.querySelectorAll(".btn.btn-info");

                  // Check if more than one button is available
                  if (updatedInfoButtons.length > 1) {
                    clearInterval(interval);
                    const overrideButton = Array.from(updatedInfoButtons).find(
                      (button) => button.textContent.includes("Override")
                    );
                    if (overrideButton) {
                      overrideButton.focus();
                    }
                  }

                  // Clear the interval after 10 seconds
                  if (counter >= 20) {
                    clearInterval(interval);
                  }
                }, 500);
              }
            } else if (alertNode.textContent.includes("Succeeded")) {
              // Check if isSecondPatron is true
              chrome.storage.local.get("requestData").then((result) => {
                console.log("Checking for second patron...");
                // TODO: Add on screen message that this is happening
                if (result?.requestData?.includes('"isSecondPatron":true')) {
                  // If true, place hold on KCLS card
                  console.log("Second patron found! Placing hold!");
                  placeHoldOnKCLSCard();
                }
                chrome.storage.local.remove("requestData");
              });
            }

            // TODO: Add logic to display solution for 'No available copies' message here
          }
        }
      }
    };

    const targetNode = document.querySelector(
      ".hold-records-list.common-form.striped-even"
    );

    const observer = new MutationObserver(handleMutationObserver);
    const config = { childList: true, subtree: true };
    observer.observe(targetNode, config);
  }

  holdScreenMods();

  // ***********************************
  // * Adds Edit Patron Button, but    *
  // * unable to get patron ID through *
  // * barcode at this time            *
  // ***********************************
  // const createEditPatronButton = () => {
  // Ugly, but most reliable selector for the search button
  //   const searchButton = document.querySelector(
  //     "button > span.align-middle"
  //   ).parentElement;
  //   const searchButtonDiv = searchButton.parentElement;

  //   const createButton = () => {
  //     const newButton = document.createElement("button");
  //     newButton.type = "button";
  //     newButton.classList.add("btn", "btn-outline-dark", "btn-sm");
  //     newButton.style.height = "100%";
  //     const newSpan = createSpanText();
  //     newButton.appendChild(newSpan);
  //     newButton.addEventListener("click", () => {
  //       const currentPatron = document.querySelector("#patron-barcode").value;
  //       console.log(currentPatron);
  //     });
  //     return newButton;
  //   };

  //   const createContainerDiv = () => {
  //     const containerDiv = document.createElement("div");
  //     containerDiv.appendChild(createButton());
  //     containerDiv.classList.add("col-lg-2");
  //     return containerDiv;
  //   };

  //   const createSpanText = () => {
  //     const newSpan = document.createElement("span");
  //     newSpan.classList.add("align-middle");
  //     newSpan.textContent = "Edit Selected Patron";
  //     return newSpan;
  //   };

  //   searchButtonDiv.parentElement.appendChild(createContainerDiv());
  // }

  // function sendMessageToBackground() {
  //   const urlSuffix = `search?org=1&limit=10&query=${searchQuery}%20&fieldClass=keyword&joinOp=&matchOp=contains&dateOp=is&ridx=122`;
  //   chrome.runtime.sendMessage({ action: "holdScreenMods", url: urlSuffix });
  // }
})();
