(async () => {
  const { states } = await import(chrome.runtime.getURL("modules/states.js"));
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );
  const autoReturnEnabled = await chrome.storage.local.get("autoReturnILL");

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
        return "NOT LISTED IN WORLDSHARE";
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
            if (addressObject[key] !== "") {
              addressString += addressObject[key] + "\n";
            }
            break;
          case "locality":
            if (!addressObject[key]) {
              const city = prompt(
                "City not listed in WorldShare. Please enter city name."
              );
              city
                ? (addressString += city + ", ")
                : (addressString += "NOT LISTED, ");
            } else {
              addressString += addressObject[key] + ", ";
            }
            break;
          case "region":
            if (!addressObject[key]) {
              const state = prompt(
                "State not listed in WorldShare. Please enter state two-letter abbreviation."
              );
              state !== ""
                ? (addressString += state.toUpperCase() + " ")
                : (addressString += "NOT LISTED ");
            } else {
              addressString +=
                convertStateNameToAbbreviation(
                  addressObject[key]
                ).toUpperCase() + " ";
            }
            break;
          case "postal":
            addressString += addressObject[key];
            break;
          default:
            break;
        }
      });
      console.log(addressString);
      isSuitableToPrint(addressString);
      console.log(isSuitableToPrint(addressString));
      return addressString;
    };

    // TODO: Implement logic to resize font size to fit label
    const resizeToFitLabel = (address, boundsWidth, boundsHeight) => {
      let fontSize = 12; // Starting font size -- Too small?
      const addressLines = address.split("\n");
      const lineHeight = boundHeight / addressLines.length; //Account for the varying lines in the address
    };

    // WorldShare address fields sometimes have a handful of special characters that need to be sanitized for XML
    const sanitizeForXML = (str) => {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")
        .replace(/\//g, "&#47;");
    };

    // Generate XML for Dymo label
    const generateLabelXML = (address) => {
      return `
            <DieCutLabel Version="8.0" Units="twips">
              <PaperOrientation>Landscape</PaperOrientation>
              <Id>Address</Id>
              <PaperName>30252 Address</PaperName>
              <DrawCommands>
                <RoundRectangle X="0" Y="0" Width="3060" Height="720" Rx="180" Ry="180" />
              </DrawCommands>
              <ObjectInfo>
                <TextObject>
                  <Name>Address</Name>
                  <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
                  <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
                  <LinkedObjectName></LinkedObjectName>
                  <Rotation>Rotation0</Rotation>
                  <IsMirrored>False</IsMirrored>
                  <IsVariable>True</IsVariable>
                  <HorizontalAlignment>Left</HorizontalAlignment>
                  <VerticalAlignment>Middle</VerticalAlignment>
                  <TextFitMode>AlwaysFit</TextFitMode>
                  <UseFullFontHeight>True</UseFullFontHeight>
                  <Verticalized>False</Verticalized>
                  <StyledText>
                    <Element>
                      <String>${address}</String>
                      <Attributes>
                        <Font Family="Arial" Size="10" Bold="False" Italic="False" Underline="False" Strikeout="False" />
                        <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
                      </Attributes>
                    </Element>
                  </StyledText>
                </TextObject>
                <Bounds X="332" Y="150" Width="4455" Height="1260" />
              </ObjectInfo>
            </DieCutLabel>`;
    };

    // Make sure address contains basic information needed for label before printing
    const isSuitableToPrint = (address) => {
      const addressLines = address.split("\n");
      // Address requires name, street address, and city/state/zip
      if (addressLines.length < 3) {
        console.error(`Address is not suitable for printing: ${address}`);
        return false;
      }
      // City and State sometimes have "NOT LISTED" or "NOT FOUND" in them
      const invalidLine =
        addressLines.find((line) => line.includes("NOT LISTED")) ||
        line.includes("NOT FOUND");
      if (invalidLine) {
        console.error(`Address is not suitable for printing: ${address}`);
        return false;
      }
      return true;
    };

    const printDymoLabel = (address) => {
      if (!isSuitableToPrint(address)) {
        statusModal(
          `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Error!</h2> <p style="font-size: 1rem;">Address is not suitable for printing.</p>`,
          "#e85e6a",
          chrome.runtime.getURL("images/kawaii-book-sad.png")
        );
        return;
      }

      const sanitizedAddress = sanitizeForXML(address);
      if (typeof dymo !== "undefined" && dymo.label.framework) {
        dymo.label.framework.init(() => {
          const labelXML = generateLabelXML(sanitizedAddress);

          const printers = dymo.label.framework.getPrinters();
          if (printers.length === 0) {
            // TODO: Pass error to modal?
            console.error("No Dymo printers found.");
            return;
          }

          const label = dymo.label.framework.openLabelXml(labelXML);
          console.log("Printing!");
          label.print(printers[0].name);
        });
      } else {
        console.error("Dymo framework is not loaded.");
      }
    };

    const addressString = createAddressString();

    // If keyboard shortcut is used, the address is copied to clipboard
    if (document.hasFocus()) navigator.clipboard.writeText(addressString);
    // If sidePanel click is used, the address is stored and extracted in sidepanel.js
    else {
      chrome.storage.local.set({ addressString: addressString });
    }

    const dymoToggle = chrome.storage.local.get("printLabel");
    dymoToggle.then((result) => {
      console.log(dymoToggle);
      console.log(result.printLabel);
      if (result.printLabel) {
        printDymoLabel(addressString);
        console.log("Did it print");
        if (autoReturnEnabled.autoReturnILL) {
          autoReturnILL();
        }
      } else {
        console.log("Dymo printing is disabled.");
      }
    });

    statusModal(
      `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Address Copied!</h2> <p style="font-size: 1rem;">The address has been copied to your clipboard.</p>`,
      "#4CAF50",
      chrome.runtime.getURL("images/kawaii-dinosaur.png")
    );
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
      `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Error!</h2> <p style="font-size: 1rem;">Please run this from WorldShare.</p>`,
      "#e85e6a",
      chrome.runtime.getURL("images/kawaii-book-sad.png")
    );
  }
})();
