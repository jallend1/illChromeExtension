(async () => {
  const { keyboardCowboy } = await import(
    chrome.runtime.getURL("modules/keyboardCowboy.js")
  );

  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );

  let mainObserver;

  /**
   * Modifications for the hold screen
   */
  function holdScreenMods() {
    keyboardCowboy(
      `Press <span style="font-weight:bold;">Ctrl+Enter</span> after entering the patron barcode to submit this hold without ever touching your mouse!`
    );

    // TODO: Test this bad boy because there has been limited testing due to few requests with second patrons
    /**
     * If item has a second patron, automatically populate departmental card barcode
     * @returns {void}
     */
    const handleSecondPatron = () => {
      statusModal(
        "Second Patron Detected!",
        `Please wait while we automatically place a hold on the departmental card.`,
        "#4CAF50",
        chrome.runtime.getURL("images/kawaii-dinosaur.png")
      );
      const barcodeField = document.querySelector("#patron-barcode");
      console.log("Barcode Field: ", barcodeField);
      // Set departmental card barcode
      barcodeField.value = "0040746158";
      const event = new Event("input", {
        bubbles: true,
        cancelable: true,
      });
      barcodeField.dispatchEvent(event);
      const placeHoldButton = document.querySelector(
        '[keydesc="Place Hold(s)"]'
      );
      console.log("Place Hold Button: ", placeHoldButton);
      // Wait for disabled attribute to be removed from placeHoldButton
      const observer = new MutationObserver((mutationList) => {
        mutationList.forEach((mutation) => {
          console.log("Mutation: ", mutation);
          if (
            mutation.type === "attributes" &&
            !placeHoldButton.hasAttribute("disabled")
          ) {
            placeHoldButton.click();
            // TODO: Check for success message and implement standard logic
            observer.disconnect(); // Stop observing once the button is clicked
          }
        });
      });
      observer.observe(placeHoldButton, {
        attributes: true,
        attributeFilter: ["disabled"],
      });
    };

    /**
     * Handles mutations in the hold status container
     * @param {Array} mutationList
     * @param {MutationObserver} observer
     */
    const handleHoldStatusMutation = (mutationList, observer) => {
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
              chrome.storage.local.get("requestData").then((result) => {
                if (!result.requestData) return;

                const requestData = JSON.parse(result.requestData);
                const { isSecondPatron, isLendingFee } = requestData;

                if (isSecondPatron) handleSecondPatron();

                console.log("Checking for lending fee...");
                if (isLendingFee && isLendingFee !== "0.00") {
                  const { patronID, title } = requestData;
                  handleFee(isLendingFee, patronID, title);
                }

                chrome.storage.local.remove("requestData");
              });
            }

            // TODO: Add logic to display solution for 'No available copies' message here
          }
        }
      }
    };

    /**
     * Handles the lending fee for a patron
     * @param {string} fee
     * @param {string} patronID
     * @param {string} title
     */
    const handleFee = (fee, patronID, title) => {
      // Employ a status modal on testing
      sendMessageToBackground(fee, patronID, title);
      // alert(`This request may have a lending fee of ${fee}.`);
    };

    const targetNode = document.querySelector(
      ".hold-records-list.common-form.striped-even"
    );

    mainObserver = new MutationObserver(handleHoldStatusMutation);
    const config = { childList: true, subtree: true };
    mainObserver.observe(targetNode, config);
  }

  holdScreenMods();

  // TODO: Send message to background script with patron barcode to open patron in new tab
  /**
   * Sends a message to the background script with patron information
   * @param {string} fee
   * @param {string} barcode
   * @param {string} title
   */
  const sendMessageToBackground = (fee, barcode, title) => {
    chrome.runtime.sendMessage(
      { action: "retrievePatron", patronBarcode: barcode, fee, title },
      (response) => {
        if (response.success) {
          console.log("Patron info retrieved successfully:", response.data);
        } else {
          console.error("Failed to retrieve patron info:", response.error);
        }
      }
    );
  };

  /**
   * Creates the edit patron button and appends it to the DOM
   */
  const createEditPatronButton = () => {
    if (document.body.dataset.editPatronButtonCreated) return;
    document.body.dataset.editPatronButtonCreated = "true";

    const searchButton = document.querySelector(
      "button > span.align-middle"
    ).parentElement;
    const searchButtonDiv = searchButton.parentElement;

    const createButton = () => {
      const newButton = document.createElement("button");
      newButton.id = "edit-patron-button";
      newButton.type = "button";
      newButton.classList.add("btn", "btn-outline-dark", "btn-sm");
      newButton.style.height = "100%";
      newButton.disabled = true;
      const newSpan = createSpanText();
      newButton.appendChild(newSpan);
      newButton.addEventListener("click", () => {
        const currentPatron = document.querySelector("#patron-barcode").value;
        console.log(currentPatron);
        // Store the current patron barcode in local storage
        chrome.storage.local.set({ patronToEdit: currentPatron });
        chrome.runtime.sendMessage(
          { action: "editPatron", patronBarcode: currentPatron },
          (response) => {
            if (response.success) {
              console.log("Patron info retrieved successfully:", response.data);
            } else {
              console.error("Failed to retrieve patron info:", response.error);
            }
          }
        );
      });

      return newButton;
    };

    /**
     * Creates the container div for the edit patron button
     * @returns {HTMLDivElement}
     */
    const createContainerDiv = () => {
      const containerDiv = document.createElement("div");
      containerDiv.appendChild(createButton());
      containerDiv.classList.add("col-lg-2");
      return containerDiv;
    };

    /**
     * Creates the span element for the edit patron button
     * @returns {HTMLSpanElement}
     */
    const createSpanText = () => {
      const newSpan = document.createElement("span");
      newSpan.classList.add("align-middle");
      newSpan.textContent = "Edit Selected Patron";
      return newSpan;
    };

    searchButtonDiv.parentElement.appendChild(createContainerDiv());
  };

  /**
   * Enables or disables the edit patron button
   * @param {boolean} boolean
   */
  const isEditDisabled = (boolean) => {
    const editButton = document.querySelector("#edit-patron-button");
    if (editButton) {
      editButton.disabled = boolean;
    }
  };

  /**
   * Compares patron names for discrepancies
   * @param {string} evgLastNameTextContent
   * @param {string} requestLastName
   */
  const comparePatronNames = (evgLastNameTextContent, requestLastName) => {
    // TODO: Add styles to name if they don't match and a warning text
    const evgLastNameArr = evgLastNameTextContent.split(",")[0];
    const indexOfParentheses = evgLastNameArr.indexOf("(");
    const evgLastName = evgLastNameArr.slice(indexOfParentheses + 1);
    console.log(evgLastName);
    console.log(requestLastName.includes(evgLastName));
  };

  /**
   * Monitors changes to the patron name field
   */
  const monitorPatronName = () => {
    const h3Elements = document.querySelectorAll("h3");

    const placeHoldField = Array.from(h3Elements).find((h3) =>
      h3.textContent.includes("Place Hold")
    );
    const parentElement = placeHoldField?.parentElement;
    if (parentElement) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
            if (mutation.addedNodes.length > 0) {
              // Check if any small tags were added
              const addedNodes = Array.from(mutation.addedNodes);
              const smallTags = addedNodes.filter(
                (node) => node.tagName === "SMALL"
              );
              const evgLastName = smallTags[0]?.textContent;

              chrome.storage.local.get("requestData").then((result) => {
                // TODO: Checking storage twice is not the way to live your life -- Lift it to global?
                if (!result.requestData) return;
                const { patronName } = JSON.parse(result.requestData);
                const requestLastName = patronName.split(",")[0];
                comparePatronNames(evgLastName, requestLastName);
              });
              isEditDisabled(!smallTags.length > 0);
            } else if (mutation.removedNodes.length > 0) {
              // Check if any small tags were removed
              const removedNodes = Array.from(mutation.removedNodes);
              const smallTags = removedNodes.filter(
                (node) => node.tagName === "SMALL"
              );
              isEditDisabled(!smallTags.length > 0);
            }
          }
        });
      });
      observer.observe(parentElement, { childList: true, subtree: true });
    }
  };

  createEditPatronButton();
  monitorPatronName();

  window.addEventListener("unload", () => {
    mainObserver.disconnect();
  });
})();
