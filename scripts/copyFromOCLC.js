(async () => {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );
  const { states } = await import(chrome.runtime.getURL("modules/states.js"));
  const { orbisLibrarySymbols } = await import(
    chrome.runtime.getURL("modules/orbisLibrarySymbols.js")
  );

  function copyFromOCLC(statusModal) {
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
      title: 'span[data="resource.title"]',
      requestNumber: ".accordionRequestDetailsRequestId",
      patronID: 'input[data="requester.patron.userId"]',
      lendingFee: 'span[data="billing.charges.amountAsString"]',
      dueDate: 'span[data="returning.originalDueToSupplier"]',
      currentLender: 'span[data="lenderString.currentSupplier.symbol"]',
      region: 'span[data="returning.address.region"]',
      patronName: 'input[data="requester.patron.name"]',
    };

    const extractValueFromField = (selector) => {
      const allMatches = document.querySelectorAll(selector);
      const currentMatch = allMatches[allMatches.length - 1];
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
        let element = extractValueFromField(
          `input[data="returning.address.${key}"]`
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
      return {
        addressString,
        requestNumber,
        title,
        patronID,
        isLendingFee,
        patronName,
      };
    };

    const convertDataToJSON = (data) => {
      return JSON.stringify(data);
    };

    const compiledData = compileRequestData();
    const stringifiedData = convertDataToJSON(compiledData);

    async function copyToStorage(data, requestNum, lendingFee) {
      // If the request number isn't defined, display an error and remove the previous data from storage just in case
      if (!requestNum) {
        const result = `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Something went wrong!</h2> <p style="font-size: 1rem;">We couldn't find a WorldShare request number on this page. To prevent errors, head back to the request and try copying it again.</p>`;
        const imgURL = chrome.runtime.getURL("images/kawaii-book-sad.png");
        const headerColor = "#e85e6a";
        chrome.storage.local.remove("requestData");
        statusModal(result, headerColor, imgURL);
        return;
      }
      try {
        const success = {
          headerColor: "#4CAF50",
          imgURL: chrome.runtime.getURL("images/kawaii-dinosaur.png"),
          result: `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Success!</h2> <p style="font-size: 1rem;">Request Number: ${requestNum}</p>`,
        };

        // Checks for requestData in local storage, and if it exists, removes it
        chrome.storage.local.get(["requestData", "lendingFee"], (result) => {
          if (result.requestData) chrome.storage.local.remove("requestData");
          chrome.storage.local.set(
            {
              requestData: data,
            },
            () => {
              statusModal(success.result, success.headerColor, success.imgURL);
            }
          );
        });
      } catch (err) {
        let result = "";
        let imgURL = chrome.runtime.getURL("images/kawaii-book-sad.png");
        let headerColor = "#e85e6a";
        if (err.message.includes("Document is not focused")) {
          result = `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Error!</h2> <p style="font-size: 1rem;">Suggested tip: Please click on the page and try again</p>`;
        } else {
          result = `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Error!</h2> <p style="font-size: 1rem;">"${err}";</p>`;
        }
        chrome.storage.local.remove("requestData");
        statusModal(result, headerColor, imgURL);
        console.error(err);
      }
    }

    const markReceived = () => {
      const receiveButton = document.querySelector(".receive-button");
      if (receiveButton) {
        receiveButton.click();
      } else {
        statusModal(
          `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Error!</h2> <p style="font-size: 1rem;">Couldn't mark it received :(</p>`,
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
    copyFromOCLC(statusModal);
  } else {
    statusModal(
      `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Error!</h2> <p style="font-size: 1rem;">This function only be used on a WorldShare page.</p>`,
      "#e85e6a",
      chrome.runtime.getURL("images/kawaii-book-sad.png")
    );
  }
})();
