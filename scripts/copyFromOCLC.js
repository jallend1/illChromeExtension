(async () => {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );
  const { states } = await import(chrome.runtime.getURL("modules/states.js"));
  const { orbisLibrarySymbols } = await import(
    chrome.runtime.getURL("modules/orbisLibrarySymbols.js")
  );

  function copyFromOCLC() {
    // Sets up addressObject with names matching OCLC address fields so it can be iterated through later
    let addressObject = {
      attention: null,
      line1: null,
      line2: null,
      locality: null,
      region: null,
      postal: null,
    };

    const elementSelectors = {
      title:
        'div:not(.yui3-default-hidden) span[data="resource.title"]:not(div.yui3-default-hidden span)',
      requestNumber:
        "div:not(.yui3-default-hidden) span.accordionRequestDetailsRequestId:not(div.yui3-default-hidden span)",
      patronID:
        'div:not(.yui3-default-hidden) input[data="requester.patron.userId"]:not(div.yui3-default-hidden input)',
      lendingFee:
        'div:not(.yui3-default-hidden) span[data="billing.charges.amountAsString"]:not(div.yui3-default-hidden span)',
      dueDate:
        'div:not(.yui3-default-hidden) span[data="returning.originalDueToSupplier"]:not(div.yui3-default-hidden span)',
      currentLender:
        'div:not(.yui3-default-hidden) span[data="lenderString.currentSupplier.symbol"]:not(div.yui3-default-hidden span)',
      region:
        'div:not(.yui3-default-hidden) span[data="returning.address.region"]:not(div.yui3-default-hidden span)',
      patronName:
        'div:not(.yui3-default-hidden) input[data="requester.patron.name"]:not(div.yui3-default-hidden input)',
      patronNote:
        'div:not(.yui3-default-hidden) textarea[data="requester.patron.note"]:not(div.yui3-default-hidden textarea)',
    };

    const extractValueFromField = (selector) => {
      const currentMatch = document.querySelector(selector);
      if (selector.includes("patron.userId"))
        return currentMatch?.value.replace(/[^0-9]/g, "");
      // If selector includes 'input' return the value, otherwise return the textContent
      return selector.includes("input")
        ? currentMatch?.value
        : currentMatch?.textContent;
    };

    const convertStateNameToAbbreviation = (stateName) => {
      // If the stateName is undefined return an empty string
      if (!stateName) return "";
      // If the stateName is not found in the states object, return "NOT FOUND"
      if (!states[stateName]) return "NOT FOUND";

      return states[stateName];
    };

    const assignAddressObjectValues = (key) => {
      if (key === "region") {
        let region = extractValueFromField(elementSelectors.region);
        region
          ? (addressObject[key] = convertStateNameToAbbreviation(region))
          : (addressObject[key] = "NONE");
      } else {
        // let element = extractValueFromField(
        //   `#requests > div:not([class*="hidden"]) input[data="returning.address.${key}"]`
        // );
        // `input[data="returning.address.${key}"]`
        let element = extractValueFromField(
          `div:not(.yui3-default-hidden) input[data="returning.address.${key}"]:not(div.yui3-default-hidden input)`
        );
        element ? (addressObject[key] = element) : (addressObject[key] = "");
      }
    };

    // Iterate through addressObject keys and extract values from page
    Object.keys(addressObject).forEach(assignAddressObjectValues);

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

    // Format lender address and notes
    const generateLenderAddressNotes = () => {
      let addressString = "";
      const currentLender = extractValueFromField(
        elementSelectors.currentLender
      );
      if (isCourier(currentLender)) addressString += "Courier\n";
      addressString += checkLenderRequirements(currentLender);
      addressString += formatLenderAddress();
      return addressString;
    };

    // Prompts user for WCCLS barcode
    const WCCLSprompt = () => {
      let barcode;
      let addressField = "";
      const title =
        "Title: " + extractValueFromField(elementSelectors.title) + "\n";
      addressField += title;
      while (!barcode) {
        barcode = prompt(
          "This is from WCCLS! Please write the 4-digit code from their paperwork. (Also can be found as the last four digits of THEIR barcode)"
        );
        if (barcode) addressField += "WCCLS barcode: " + barcode + "\n";
      }
      return addressField;
    };

    const checkLenderRequirements = (currentLender) => {
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
      if (currentLender === "OQX") return WCCLSprompt();
      return "";
    };

    const requiresPaperwork = (oclcSymbol) => {
      const paperworkLibraries = ["COW", "DLC", "WSE", "YEP", "ZWR"];
      if (paperworkLibraries.includes(oclcSymbol)) {
        alert("This library would like us to keep the paperwork.");
      }
    };

    const isCourier = (oclcSymbol) => {
      return orbisLibrarySymbols.includes(oclcSymbol);
    };

    // Bundles all pertinent information into an object
    const compileRequestData = () => {
      const addressString = generateLenderAddressNotes();
      const requestNumber = extractValueFromField(
        elementSelectors.requestNumber
      );
      const title = extractValueFromField(elementSelectors.title);
      const patronID = extractValueFromField(elementSelectors.patronID);
      const isLendingFee = extractValueFromField(elementSelectors.lendingFee);
      const patronName = extractValueFromField(elementSelectors.patronName);
      const isSecondPatron = extractValueFromField(
        elementSelectors.patronNote
      )?.includes("2nd");

      return {
        addressString,
        requestNumber,
        title,
        patronID,
        isLendingFee,
        patronName,
        isSecondPatron,
      };
    };

    const convertDataToJSON = (data) => {
      return JSON.stringify(data);
    };

    const compiledData = compileRequestData();
    const stringifiedData = convertDataToJSON(compiledData);

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
    });
    // If autoOpenCreateILL is true, send a message to the background script to open the tab
    chrome.storage.local.get("openCreateILL", (result) => {
      if (result.openCreateILL) {
        chrome.runtime.sendMessage({ command: "openCreateILL" });
      }
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
