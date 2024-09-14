(async () => {
  const { states } = await import(chrome.runtime.getURL("modules/states.js"));

  function copyWorldShareAddress() {
    let addressObject = {
      attention: null,
      line1: null,
      line2: null,
      locality: null,
      region: null,
      postal: null,
    };

    const convertStateNameToAbbreviation = (stateName) => {
      if (!stateName) {
        return "NOT LISTED";
      }
      if (!states[stateName]) {
        return "NOT FOUND";
      }
      return states[stateName];
    };

    const lendingSelectors = {
      attention: 'span[data="delivery.address.attention"]',
      line1: 'span[data="delivery.address.line1"]',
      line2: 'span[data="delivery.address.line2"]',
      locality: 'span[data="delivery.address.locality"]',
      region: 'span[data="delivery.address.region"]',
      postal: 'span[data="delivery.address.postal"]',
    };

    const borrowingSelectors = {
      attention: 'input[data="returning.address.attention"]',
      line1: 'input[data="returning.address.line1"]',
      line2: 'input[data="returning.address.line2"]',
      locality: 'input[data="returning.address.locality"]',
      region: 'span[data="returning.address.region"]',
      postal: 'input[data="returning.address.postal"]',
    };

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
      ? addressFields(lendingSelectors)
      : addressFields(borrowingSelectors);

    // Format addressObject for mail label
    const createAddressString = () => {
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
            addressObject[key] === null
              ? (addressString += "NOT LISTED ")
              : (addressString +=
                  convertStateNameToAbbreviation(
                    addressObject[key]
                  ).toUpperCase() + " ");
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

    const addressString = createAddressString();

    // If keyboard shortcut is used, the address is copied to clipboard
    if (document.hasFocus()) navigator.clipboard.writeText(addressString);
    // If sidePanel click is used, the address is stored and extracted in sidepanel.js
    else {
      chrome.storage.local.set({ addressString: addressString }, () => {});
    }
  }

  copyWorldShareAddress();
})();
