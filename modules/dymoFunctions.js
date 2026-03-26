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
          chrome.runtime.lastError,
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
    },
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
    const lines = address.split("\n");
    const firstLineFontSize = lines[0].length > 30 ? 8 : 10;
    const styledElements = lines
      .map((line, i) => {
        const fontSize = i === 0 ? firstLineFontSize : 10;
        const str = i < lines.length - 1 ? `${line}&#13;` : line;
        return `<Element>
                        <String>${str}</String>
                        <Attributes>
                          <Font Family="Arial" Size="${fontSize}" Bold="False" Italic="False" Underline="False" Strikeout="False" />
                          <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
                        </Attributes>
                      </Element>`;
      })
      .join("\n                      ");
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
                      ${styledElements}
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
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
      .replace(/\//g, "&#47;");
  },
  /**
   * Checks if the address is suitable for printing on a Dymo label.
   * @param {string} address - The address to check.
   * @returns {boolean} True if the address is suitable, false otherwise.
   */
  isSuitableToPrint: (address) => {
    const addressLines = address.split("\n");
    // Address requires name, street address, and city/state/zip
    if (addressLines.length < 3) {
      console.error(`Address is not suitable for printing: ${address}`);
      return false;
    }
    // City and State sometimes have "NOT LISTED" or "NOT FOUND" in them
    const invalidLine = addressLines.find(
      (line) => line.includes("NOT LISTED") || line.includes("NOT FOUND"),
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
    const { statusModal } = await import(
      chrome.runtime.getURL("modules/modals.js")
    );
    if (typeof dymo !== "undefined" && dymo.label.framework) {
      console.log("Dymo framework detected, calling init...");
      dymo.label.framework.init(
        () => {
          console.log("Dymo framework init callback fired.");
          const sanitizedAddress = dymoFunctions.sanitizeForXML(address);
          const labelXML = dymoFunctions.generateLabelXML(sanitizedAddress);
          console.log("Generated label XML:", labelXML);

          let printers;
          try {
            printers = dymo.label.framework.getPrinters();
            console.log("Printers found:", JSON.stringify(printers));
          } catch (e) {
            console.error("Error calling getPrinters():", e);
            return;
          }

          if (printers.length === 0) {
            // TODO: Pass error to modal?
            console.error("No Dymo printers found.");
            return;
          }

          console.log(
            "Attempting to print to printer:",
            printers[0].name,
            "| Model:",
            printers[0].modelName,
            "| Connected:",
            printers[0].isConnected,
          );

          let label;
          try {
            label = dymo.label.framework.openLabelXml(labelXML);
            console.log("Label opened successfully.");
          } catch (e) {
            console.error("Error calling openLabelXml():", e);
            return;
          }

          try {
            label.print(printers[0].name);
            console.log("label.print() called successfully.");
          } catch (e) {
            console.error("Error calling label.print():", e);
          }
        },
        (err) => {
          console.error("Dymo framework init failed:", err);
        },
      );
    } else {
      console.error("Dymo framework is not loaded.");
    }
  },
};
