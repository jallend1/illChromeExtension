(async () => {
  const { states } = await import(chrome.runtime.getURL("modules/states.js"));
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );
  const { borrowingAddressSelectors, lendingAddressSelectors } = await import(
    chrome.runtime.getURL("modules/constants.js")
  );

  const { dymoFunctions } = await import(
    chrome.runtime.getURL("modules/dymoFunctions.js")
  );

  const autoReturnEnabled = await chrome.storage.local.get("autoReturnILL");
  const { printLabel } = await chrome.storage.local.get("printLabel");

  /**
   * Copies the address information from the WorldShare interface
   * @returns {Object} The copied address information
   */
  function copyWorldShareAddress() {
    let addressObject = {
      attention: null,
      line1: null,
      line2: null,
      locality: null,
      region: null,
      postal: null,
    };

    /**
     * Converts a state name to its two-letter abbreviation
     * @param {string} stateName - The full name of the state
     * @returns {string} The two-letter abbreviation of the state
     */
    const convertStateNameToAbbreviation = (stateName) => {
      if (!stateName) return "NOT LISTED IN WORLDSHARE";
      return states[stateName] ?? "NOT FOUND";
    };

    /**
     * Checks if the current request is a lending request
     * @return {boolean} True if it is a lending request, false otherwise
     */
    const isLendingRequest = () => {
      let lender;
      // Returns lending request if request pulled up through requests
      lender = document.querySelector(
        "#requests > div:not([class*='hidden']) span.nd-mainPanelTitle + span.borrowingInformationExtra"
      );
      // If nothing is found under requests, returns lending request if request pulled up through search bar
      if (lender === null) {
        lender = document.querySelector(
          "#requestSearchResults > div:not([class*='hidden']) span.nd-mainPanelTitle + span.borrowingInformationExtra"
        );
        return lender !== null;
      }
      return lender !== null;
    };

    const addressFields = (selectors) => {
      Object.keys(selectors).forEach((key) => {
        // If request brought up from borrowing/lending queue, under a #requests div
        let nodeList = document.querySelectorAll(
          "#requests > div:not([class*='hidden']) " + selectors[key]
        );
        // If request brought up from search bar, under a #requestSearchResults div
        if (nodeList.length === 0) {
          nodeList = document.querySelectorAll(
            "#requestSearchResults > div:not([class*='hidden']) " +
              selectors[key]
          );
        }

        if (nodeList.length > 0) {
          selectors[key].includes("input")
            ? (addressObject[key] = nodeList[nodeList.length - 1].value)
            : (addressObject[key] = nodeList[nodeList.length - 1].innerText);
        }
      });
    };

    // Iterate through addressObject keys and extract values from page
    isLendingRequest()
      ? addressFields(lendingAddressSelectors)
      : addressFields(borrowingAddressSelectors);

    // Format addressObject for mail label
    const createAddressString = () => {
      const addressParts = Object.entries(addressObject).map(([key, value]) => {
        switch (key) {
          case "attention":
          case "line1":
          case "line2":
            return value ? `${value}\n` : "";
          case "locality":
            if (!value) {
              const city = prompt(
                "City not listed in WorldShare. Please enter city name or press enter to dismiss."
              );
              return city ? `${city}, ` : "NOT LISTED, ";
            }
            return `${value}, `;
          case "region":
            if (!value) {
              const state = prompt(
                "State not listed in WorldShare. Please enter state two-letter abbreviation or press enter to dismiss."
              );
              return state ? `${state.toUpperCase()} ` : "NOT LISTED ";
            }
            return `${convertStateNameToAbbreviation(value).toUpperCase()} `;
          case "postal":
            return value || "";
          default:
            return "";
        }
      });
      return addressParts.join("");
    };

    // Check if address is valid before printing by looking at first three lines
    const validAddressFound = () => {
      if (
        !addressObject.attention &&
        !addressObject.line1 &&
        !addressObject.line2
      ) {
        statusModal(
          "Error!",
          "Couldn't find a valid address found on this page.",
          "#e85e6a",
          chrome.runtime.getURL("images/kawaii-book-sad.png")
        );
        return false;
      }
      return true;
    };

    if (validAddressFound()) {
      const addressString = createAddressString();

      // If keyboard shortcut is used, the address is copied to clipboard
      if (document.hasFocus()) navigator.clipboard.writeText(addressString);
      // If sidePanel click is used, the address is stored and extracted in sidepanel.js
      else {
        chrome.storage.local.set({ addressString: addressString }, () => {
          // Send message to sidepanel.js to extract address
          chrome.runtime.sendMessage({ type: "addressReady" });
        });
      }

      if (printLabel) {
        // Prints the Dymo label and indicates as much in status modal
        if (dymoFunctions.isSuitableToPrint(addressString)) {
          dymoFunctions.printDymoLabel(addressString);
          statusModal(
            "Printing label!",
            "The address has also been copied to your clipboard.",
            "#4CAF50",
            chrome.runtime.getURL("images/kawaii-dinosaur.png")
          );
        } else {
          statusModal(
            "Error!",
            "Address is not suitable for printing.",
            "#e85e6a",
            chrome.runtime.getURL("images/kawaii-book-sad.png")
          );
          return;
        }
      } else {
        // Displays a success modal indicating the address has been copied
        statusModal(
          "Address Copied!",
          "The address has been copied to your clipboard.",
          "#4CAF50",
          chrome.runtime.getURL("images/kawaii-dinosaur.png")
        );
      }
    } else {
      statusModal(
        "Error!",
        "Address is not valid.",
        "#e85e6a",
        chrome.runtime.getURL("images/kawaii-book-sad.png")
      );
      return;
    }
  }

  const autoReturnILL = () => {
    const returnButtons = document.querySelectorAll(
      "button.returned-button.button-return"
    );
    const buttonId = returnButtons[returnButtons.length - 1].id;
    const requestId = buttonId.split("-")[1];
    // TODO: Pass request ID to modal along with address and title?
    console.log(`Returning ILL request ${requestId}...`);
    returnButtons[returnButtons.length - 1].click();
  };

  const currentURL = window.location.href;
  if (currentURL.includes("worldcat.org")) {
    copyWorldShareAddress();
    if (autoReturnEnabled.autoReturnILL) {
      autoReturnILL();
    }
  } else {
    statusModal(
      "Error!",
      "Please run this from WorldShare.",
      "#e85e6a",
      chrome.runtime.getURL("images/kawaii-book-sad.png")
    );
  }
})();
