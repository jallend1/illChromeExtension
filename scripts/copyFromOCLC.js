// TODO: Oh lordy. This file has been untouched since it was brute forced and it shows :(

(async () => {
  const { statusModal, inputModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );
  const { states } = await import(chrome.runtime.getURL("data/states.js"));
  const { orbisLibrarySymbols } = await import(
    chrome.runtime.getURL("data/orbisLibrarySymbols.js")
  );

  async function copyFromOCLC() {
    // Sets up addressObject with names matching OCLC address fields so it can be iterated through later
    let addressObject = {
      attention: null,
      line1: null,
      line2: null,
      locality: null,
      region: null,
      postal: null,
    };

    /**
     * Builds a CSS selector string based on the provided parameters
     * @param {string} tag - The HTML tag to select
     * @param {string} dataAttr - The data attribute to match
     * @param {string} className - The class name to match
     * @returns {string} The constructed CSS selector
     */
    function buildSelector({ tag, dataAttr, className }) {
      if (className) {
        return `div:not(.yui3-default-hidden) ${tag}.${className}:not(div.yui3-default-hidden ${tag})`;
      }
      return `div:not(.yui3-default-hidden) ${tag}[data="${dataAttr}"]:not(div.yui3-default-hidden ${tag})`;
    }

    /**
     * An object of CSS selectors for extracting information from the OCLC interface
     * @type {Object<string, string>}
     */
    const elementSelectors = {
      title: buildSelector({ tag: "span", dataAttr: "resource.title" }),
      requestNumber: buildSelector({
        tag: "span",
        className: "accordionRequestDetailsRequestId",
      }),
      patronID: buildSelector({
        tag: "input",
        dataAttr: "requester.patron.userId",
      }),
      lendingFee: buildSelector({
        tag: "span",
        dataAttr: "billing.charges.amountAsString",
      }),
      dueDate: buildSelector({
        tag: "span",
        dataAttr: "returning.originalDueToSupplier",
      }),
      currentLender: buildSelector({
        tag: "span",
        dataAttr: "lenderString.currentSupplier.symbol",
      }),
      region: buildSelector({
        tag: "span",
        dataAttr: "returning.address.region",
      }),
      patronName: buildSelector({
        tag: "input",
        dataAttr: "requester.patron.name",
      }),
      patronNote: buildSelector({
        tag: "textarea",
        dataAttr: "requester.patron.note",
      }),
    };

    /**
     * Extracts the value from a field based on the provided CSS selector
     * @param {string} selector - The CSS selector for the field
     * @returns {string|null} The extracted value or null if not found
     */
    const extractValueFromField = (selector) => {
      const currentMatch = document.querySelector(selector);
      if (selector.includes("patron.userId"))
        return currentMatch?.value.replace(/[^0-9]/g, "");
      // If selector includes 'input' return the value, otherwise return the textContent
      return selector.includes("input")
        ? currentMatch?.value
        : currentMatch?.textContent;
    };

    /**
     * Converts a state name to its abbreviation
     * @param {string} stateName - The full name of the state
     * @returns {string} The abbreviated state name or an empty string if not found
     */
    const convertStateNameToAbbreviation = (stateName) => {
      // TODO: Should this just return an empty string or NOT FOUND for both? Why the distinction?
      // If the stateName is undefined return an empty string
      if (!stateName) return "";
      // If the stateName is not found in the states object, return "NOT FOUND"
      if (!states[stateName]) return "NOT FOUND";

      return states[stateName];
    };

    /**
     * Assigns values to the addressObject based on the extracted field values
     * @param {string} key - The key for the addressObject
     */
    const assignAddressObjectValues = (key) => {
      if (key === "region") {
        let region = extractValueFromField(elementSelectors.region);
        region
          ? (addressObject[key] = convertStateNameToAbbreviation(region))
          : (addressObject[key] = "NONE");
      } else {
        let element = extractValueFromField(
          `div:not(.yui3-default-hidden) input[data="returning.address.${key}"]:not(div.yui3-default-hidden input)`
        );
        element ? (addressObject[key] = element) : (addressObject[key] = "");
      }
    };

    // Iterate through addressObject keys and extract values from page
    Object.keys(addressObject).forEach(assignAddressObjectValues);

    /**
     * Converts the addressObject into a formatted string
     * @returns {string} The formatted address string
     */
    const formatLenderAddress = () => {
      let addressString = "";
      Object.keys(addressObject).forEach((key) => {
        switch (key) {
          case "attention":
          case "line1":
          case "line2":
            if (addressObject[key] !== "")
              addressString += addressObject[key] + "\n";
            break;
          case "locality":
            addressString += addressObject[key] + ", ";
            break;
          case "region":
            addressString += addressObject[key] + " ";
            break;
          case "postal":
            addressString += addressObject[key];
            break;
          default:
            break;
        }
      });
      return addressString;
    };

    /**
     * Compiles the lender address notes for insertion into Evergreen
     * @returns {Promise<string|null>} The formatted lender address notes, or null if cancelled
     */
    const generateLenderAddressNotes = async () => {
      let addressString = "";
      const currentLender = extractValueFromField(
        elementSelectors.currentLender
      );
      if (isCourier(currentLender)) addressString += "Courier\n";
      const lenderRequirements = await checkLenderRequirements(currentLender);
      if (lenderRequirements === null) return null;
      addressString += lenderRequirements;
      addressString += formatLenderAddress();
      return addressString;
    };

    /**
     * Prompts the user for the WCCLS barcode
     * @returns {Promise<string|null>} The WCCLS barcode information, or null if cancelled
     * @description This function prompts the user to enter the WCCLS barcode information (Something WCCLS requires) and returns it for inclusion in the address notes.
     */
    const WCCLSprompt = async () => {
      let addressField = "";
      const title =
        "Title: " + extractValueFromField(elementSelectors.title) + "\n";
      addressField += title;

      const barcode = await inputModal(
        "WCCLS Request",
        "Please enter the 4-digit code from their paperwork (last four digits of THEIR barcode):",
        "#3b607c",
        chrome.runtime.getURL("images/kawaii-dinosaur.png")
      );

      // If cancelled (null), abort the entire process
      if (barcode === null) {
        return null;
      }

      // If empty string (user skipped after warning), don't add barcode
      if (barcode === "") {
        return addressField;
      }

      // Valid barcode entered
      addressField += "WCCLS barcode: " + barcode + "\n";
      return addressField;
    };

    /**
     * Checks the requirements for the current lender
     * @param {string} currentLender - The current lender's identifier
     * @returns {Promise<string|null>} The requirements for the current lender, or null if cancelled
     * @description This function checks for any unique requirements that the current lender may have, and integrates that into the note to be pasted into Evergreen.
     */
    const checkLenderRequirements = async (currentLender) => {
      // Checks to see if the current lender requires paperwork to be kept
      requiresPaperwork(currentLender);
      const dueDateLibraries = ["BLP", "ZWR", "COW"];
      if (dueDateLibraries.includes(currentLender)) {
        // BLP requires due date on their paperwork, and
        // I'm guessing that is also why ZWR and COW also wants
        // their paperwork kept because it looks the same
        const dueDate = extractValueFromField(elementSelectors.dueDate);
        return "OCLC Due Date: " + dueDate + "\n";
      }
      // Implements WCCLS unique requirements
      if (currentLender === "OQX") return await WCCLSprompt();
      return "";
    };

    /**
     * Checks if the current library requires paperwork to be kept
     * @param {string} oclcSymbol - The OCLC symbol of the library
     * @description This function checks if the current library is one of the libraries that requires paperwork to be kept and throws an alert if it does.
     */
    const requiresPaperwork = (oclcSymbol) => {
      const paperworkLibraries = ["COW", "DLC", "WSE", "YEP", "ZWR"];
      if (paperworkLibraries.includes(oclcSymbol)) {
        alert("This library would like us to keep the paperwork.");
      }
    };

    /**
     * Checks if the current library is an Orbis library
     * @param {string} oclcSymbol - The OCLC symbol of the library
     * @returns {boolean} True if the library is an Orbis library, false otherwise
     */
    const isCourier = (oclcSymbol) => {
      return orbisLibrarySymbols.includes(oclcSymbol);
    };

    /**
     * Compiles the request data for the current loan
     * @returns {Promise<object|null>} The compiled request data, or null if cancelled
     */
    const compileRequestData = async () => {
      const addressString = await generateLenderAddressNotes();
      if (addressString === null) return null;

      const requestNumber = extractValueFromField(
        elementSelectors.requestNumber
      );
      const title = extractValueFromField(elementSelectors.title);
      const patronID = extractValueFromField(elementSelectors.patronID);
      const isLendingFee = extractValueFromField(elementSelectors.lendingFee);
      const patronName = extractValueFromField(elementSelectors.patronName);
      const isSecondPatron = extractValueFromField(
        elementSelectors.patronNote
      )?.includes("2nd pa");
      const patronNote = extractValueFromField(elementSelectors.patronNote);

      return {
        addressString,
        requestNumber,
        title,
        patronID,
        isLendingFee,
        patronName,
        isSecondPatron,
        patronNote,
      };
    };

    /**
     * Converts the request data to a JSON string
     * @param {object} data - The request data to convert
     * @returns {string} The JSON string representation of the request data
     */
    const convertDataToJSON = (data) => {
      return JSON.stringify(data);
    };

    const compiledData = await compileRequestData();

    // If user cancelled, abort the process
    if (compiledData === null) {
      statusModal(
        "Cancelled",
        "Process cancelled by user.",
        "#999",
        chrome.runtime.getURL("images/kawaii-book-sad.png")
      );
      return;
    }

    const stringifiedData = convertDataToJSON(compiledData);

    /**
     * Copies the data to Chrome's storage
     * @param {object} data - The data to copy
     * @param {string} requestNum - The request number
     */
    async function copyToStorage(data, requestNum) {
      // If the request number isn't defined, display an error and remove the previous data from storage just in case
      if (!requestNum) {
        const resultHeading = "Something went wrong!";
        const resultMessage = `We couldn't find a WorldShare request number on this page. To prevent errors, head back to the request and try copying it again.`;
        const imgURL = chrome.runtime.getURL("images/kawaii-book-sad.png");
        const headerColor = "#e85e6a";
        chrome.storage.local.remove("requestData");
        statusModal(resultHeading, resultMessage, headerColor, imgURL);
        return;
      }
      try {
        const success = {
          headerColor: "#4CAF50",
          imgURL: chrome.runtime.getURL("images/kawaii-dinosaur.png"),
          heading: "Success!",
          message: "Request Number: " + requestNum,
        };

        // Clears previous data from storage
        chrome.storage.local.remove(["requestData"], () => {
          chrome.storage.local.set(
            {
              requestData: data,
            },
            () => {
              statusModal(
                success.heading,
                success.message,
                success.headerColor,
                success.imgURL
              );
            }
          );
        });
      } catch (err) {
        let result = "";
        let imgURL = chrome.runtime.getURL("images/kawaii-book-sad.png");
        let headerColor = "#e85e6a";
        if (err.message.includes("Document is not focused")) {
          heading = "Error!";
          message = "Suggested tip: Please click on the page and try again";
        } else {
          heading = "Error!";
          message = "Something went wrong! Please try again.";
        }
        chrome.storage.local.remove("requestData");
        statusModal(heading, message, headerColor, imgURL);
        console.error(err);
      }
    }

    /**
     * Marks the current loan as received in WorldShare
     */
    const markReceived = () => {
      const receiveButton = document.querySelector(".receive-button");
      if (receiveButton) {
        receiveButton.click();
      } else {
        statusModal(
          "Error!",
          "Couldn't mark it received :(",
          "#e85e6a",
          chrome.runtime.getURL("images/kawaii-book-sad.png")
        );
      }
    };

    copyToStorage(stringifiedData, compiledData.requestNumber);
    chrome.storage.local.get("autoReceiveRequest", (result) => {
      if (result.autoReceiveRequest) markReceived();
      chrome.runtime.sendMessage({ command: "openCreateILL" });
    });
  }

  const currentURL = window.location.href;
  if (currentURL.includes("worldcat.org")) {
    copyFromOCLC();
  } else {
    statusModal(
      "Error!",
      "This function only be used on a WorldShare page.",
      "#e85e6a",
      chrome.runtime.getURL("images/kawaii-book-sad.png")
    );
  }
})();
