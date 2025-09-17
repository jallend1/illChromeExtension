/**
 * Injects the Dymo framework into the specified tab.
 * @param {number} tabId - The ID of the tab to inject the framework into.
 * @returns {Promise<void>}
 */

export const injectDymoFramework = (tabId) => {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      func: () => {
        return typeof dymo !== "undefined" && dymo.label;
      },
    },
    (result) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error injecting Dymo framework:",
          chrome.runtime.lastError
        );
        return;
      }
      const isDymoLoaded = result[0]?.result;
      if (!isDymoLoaded) {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ["./libs/dymo.connect.framework.js"],
        });
      }
    }
  );
};

/**
 * Dymo functions for label generation and printing.
 * @module dymoFunctions
 */
export const dymoFunctions = {
  /**
   * Generates the XML for a Dymo label.
   * @param {string} address - The address to include on the label.
   * @returns {string} The generated XML.
   */
  generateLabelXML: (address) => {
    console.log("Generating label XML...");
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
  },
  /**
   * Sanitizes a string for inclusion in XML.
   * @param {string} str - The string to sanitize.
   * @returns {string} The sanitized string.
   */
  sanitizeForXML: (str) => {
    console.log("Sanitizing string for XML...");
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
      .replace(/\//g, "&#47;");
  },
  // TODO: Implement logic to resize font size to fit label-- Currently not used anywhere
  resizeToFitLabel: (address, boundsWidth, boundsHeight) => {
    console.log("Resizing address to fit label...");
    let fontSize = 12; // Starting font size -- Too small?
    const addressLines = address.split("\n");
    const lineHeight = boundHeight / addressLines.length; //Account for the varying lines in the address
  },
  /**
   * Checks if the address is suitable for printing on a Dymo label.
   * @param {string} address - The address to check.
   * @returns {boolean} True if the address is suitable, false otherwise.
   */
  isSuitableToPrint: (address) => {
    console.log("Checking if address is suitable to print...");
    const addressLines = address.split("\n");
    // Address requires name, street address, and city/state/zip
    if (addressLines.length < 3) {
      console.error(`Address is not suitable for printing: ${address}`);
      return false;
    }
    // City and State sometimes have "NOT LISTED" or "NOT FOUND" in them
    const invalidLine = addressLines.find(
      (line) => line.includes("NOT LISTED") || line.includes("NOT FOUND")
    );
    if (invalidLine) {
      console.error(`Address is not suitable for printing: ${address}`);
      return false;
    }
    return true;
  },
  /**
   * Prints a Dymo label with the specified address.
   * @param {string} address - The address to print on the label.
   */
  printDymoLabel: async (address) => {
    console.log("Printing Dymo label from inside dymoFunctions...");
    const { statusModal } = await import(
      chrome.runtime.getURL("modules/modal.js")
    );
    if (typeof dymo !== "undefined" && dymo.label.framework) {
      dymo.label.framework.init(() => {
        const sanitizedAddress = dymoFunctions.sanitizeForXML(address);
        const labelXML = dymoFunctions.generateLabelXML(sanitizedAddress);

        const printers = dymo.label.framework.getPrinters();
        if (printers.length === 0) {
          // TODO: Pass error to modal?
          console.error("No Dymo printers found.");
          return;
        }
        const label = dymo.label.framework.openLabelXml(labelXML);
        label.print(printers[0].name);
      });
    } else {
      console.error("Dymo framework is not loaded.");
    }
  },
};
