(async () => {
  const { keyboardCowboy } = await import(
    chrome.runtime.getURL("modules/modals.js")
  );

let mainObserver;

  /**
   * Modifications for the hold screen
   */
  function holdScreenMods() {
    keyboardCowboy(
      `Press <span style="font-weight:bold;">Ctrl+Enter</span> after entering the patron barcode to submit this hold without ever touching your mouse!`
    );

    /**
     * If item has a second patron, show a banner prompting staff to place a hold for KCLS
     * @returns {void}
     */
    const handleSecondPatron = () => {
      if (document.querySelector("#second-patron-banner")) return;

      const banner = document.createElement("div");
      banner.id = "second-patron-banner";
      banner.style.cssText =
        "width:100%;background:#e65100;color:#fff;border-top:4px solid #bf360c;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;margin-top:16px;font-size:1.05rem;box-shadow:0 -2px 8px rgba(0,0,0,0.2);";

      const message = document.createElement("span");
      message.textContent =
        "Potential Second Patron Detected: Place hold for patron and then place hold for KCLS.";
      message.style.fontWeight = "700";

      const button = document.createElement("button");
      button.textContent = "Place Hold for KCLS";
      button.classList.add("btn", "btn-warning", "btn-sm");
      button.addEventListener("click", () => {
        const barcodeField = document.querySelector("#patron-barcode");
        barcodeField.value = "0040746158";
        barcodeField.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
        barcodeField.focus();

        // State 1: Placing hold...
        banner.innerHTML = "";
        banner.style.background = "#ffc107";
        banner.style.color = "#000";
        banner.style.borderTopColor = "#e0a800";
        banner.style.justifyContent = "center";
        const placingMsg = document.createElement("span");
        placingMsg.textContent = "Placing hold...";
        placingMsg.style.fontWeight = "700";
        banner.appendChild(placingMsg);

        // Watch for success and transition to State 2
        const successSelector =
          "#staff-content-container > ng-component > ng-component > div.hold-records-list.common-form.striped-even > div.row.mt-1.ms-1.me-1 > div > div > div:nth-child(6) > div";
        const successObserveTarget = document.querySelector(
          ".hold-records-list.common-form.striped-even"
        );

        const checkSuccess = () => {
          const el = document.querySelector(successSelector);
          if (el?.textContent.includes("Succeeded")) {
            successObserver.disconnect();
            banner.innerHTML = "";
            banner.style.background = "#0d6efd";
            banner.style.color = "#fff";
            banner.style.borderTopColor = "#0a58ca";
            banner.style.justifyContent = "center";
            const successMsg = document.createElement("span");
            successMsg.textContent = "Success!";
            successMsg.style.fontWeight = "700";
            banner.appendChild(successMsg);
            setTimeout(() => banner.remove(), 2000);
          }
        };

        const successObserver = new MutationObserver(checkSuccess);
        if (successObserveTarget) {
          successObserver.observe(successObserveTarget, { childList: true, subtree: true, characterData: true });
        }

        // Click the Place Hold button once KCLS patron is loaded
        const h3Elements = document.querySelectorAll("h3");
        const placeHoldH3 = Array.from(h3Elements).find((h3) =>
          h3.textContent.includes("Place Hold")
        );
        const placeHoldButton = document.querySelector(
          "#staff-content-container > ng-component > ng-component > form > div > div:nth-child(2) > div > ul > li > button.btn.btn-success"
        );

        const attemptClick = () => {
          const patronNameSmall = placeHoldH3?.querySelector("small");
          if (
            patronNameSmall?.textContent.includes("KING COUNTY LIBRARY SYSTEM") &&
            placeHoldButton &&
            !placeHoldButton.disabled
          ) {
            nameObserver.disconnect();
            buttonObserver.disconnect();
            placeHoldButton.click();
          }
        };

        const nameObserver = new MutationObserver(attemptClick);
        const buttonObserver = new MutationObserver(attemptClick);

        if (placeHoldH3) {
          nameObserver.observe(placeHoldH3, { childList: true, subtree: true, characterData: true });
        }
        if (placeHoldButton) {
          buttonObserver.observe(placeHoldButton, { attributes: true, attributeFilter: ["disabled"] });
        }
      });

      banner.appendChild(message);
      banner.appendChild(button);
      document.body.appendChild(banner);
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
                const { isLendingFee } = requestData;

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

    chrome.storage.local.get("requestData").then((result) => {
      if (!result.requestData) return;
      const { isSecondPatron } = JSON.parse(result.requestData);
      if (isSecondPatron) handleSecondPatron();
    });
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
