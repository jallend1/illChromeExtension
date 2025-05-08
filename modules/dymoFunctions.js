export const dymoFunctions = {
  // Generate XML for Dymo label
  generateLabelXML: (address) => {
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
  // WorldShare address fields sometimes have a handful of special characters that need to be sanitized for XML
  sanitizeForXML: (str) => {
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
    let fontSize = 12; // Starting font size -- Too small?
    const addressLines = address.split("\n");
    const lineHeight = boundHeight / addressLines.length; //Account for the varying lines in the address
  },
  // Make sure address contains basic information needed for label before printing
  isSuitableToPrint: (address) => {
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
  printDymoLabel: (address) => {
    if (!dymoFunctions.isSuitableToPrint(address)) {
      statusModal(
        "Error!",
        "Address is not suitable for printing.",
        "#e85e6a",
        chrome.runtime.getURL("images/kawaii-book-sad.png")
      );
      return;
    }

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
        console.log("Printing!");
        label.print(printers[0].name);
      });
    } else {
      console.error("Dymo framework is not loaded.");
    }
  },
};
