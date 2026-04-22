(async () => {
  const { waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );
  const { createMiniModal } = await import(
    chrome.runtime.getURL("modules/modals.js")
  );

  const { dymoFunctions } = await import(
    chrome.runtime.getURL("modules/dymoFunctions.js")
  );

  const patronNameElement = await waitForElementWithInterval(
    ".patron-summary-container > .patron-status-color",
  );

  if (!patronNameElement) return;

  /**
   * Creates the print button element
   * @returns {HTMLButtonElement}
   */
  const createButton = () => {
    const printButton = document.createElement("button");
    printButton.innerText = "Print (ILL Remix)";
    printButton.id = "jason-print-button";
    return printButton;
  };

  /**
   * Creates the container element for the print button
   * @returns {HTMLDivElement}
   */
  const createContainer = () => {
    const container = document.createElement("div");
    const containerStyles = {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      margin: "1rem 0",
    };
    Object.assign(container.style, containerStyles);
    return container;
  };

  /**
   * Adds the container with the print button to the DOM
   * @returns {void}
   */
  const addContainerToDOM = () => {
    const printButton = createButton();
    const container = createContainer();
    container.appendChild(printButton);
    patronNameElement.after(container);

    printButton.addEventListener("click", async () => {
      const address = await waitForElementWithInterval(
        '[id^="patron-address-copy-"]',
      );
      if (!address) {
        createMiniModal(
          "Could not find patron address — is it loaded on the page?",
          true,
        );
        return;
      }
      createMiniModal("Printing address label...");
      dymoFunctions.printDymoLabel(address.textContent);
    });
  };

  const jasonsButton = document.querySelector("#jason-print-button");
  if (!jasonsButton) {
    addContainerToDOM();
  }

  // Calibrate wrap threshold using the longest known string that fits on one label line.
  const _canvas = document.createElement("canvas");
  const _ctx = _canvas.getContext("2d");
  _ctx.font = "14px Arial";
  const WRAP_THRESHOLD = _ctx.measureText("NEW YORK PUBLIC LIBRARY  ILL").width;

  /**
   * Estimates how many printed lines an address string will occupy,
   * using canvas text measurement to detect lines that will wrap.
   * @param {string} addressText
   * @returns {number}
   */
  const countPrintedLines = (addressText) =>
    addressText
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .reduce((total, line) => {
        const width = _ctx.measureText(line.trim()).width;
        return total + Math.ceil(width / WRAP_THRESHOLD);
      }, 0);

  /**
   * Detects whether any address line contains "PO BOX" away from line start.
   * @param {string} addressText
   * @returns {boolean}
   */
  const hasPOBoxAwayFromLineStart = (addressText) =>
    addressText
      .split("\n")
      .some((line) => line.toUpperCase().indexOf("PO BOX") > 0);

  /**
   * Detects suite-like address indicators.
   * @param {string} addressText
   * @returns {boolean}
   */
  const hasSuiteIndicator = (addressText) =>
    addressText.split("\n").some((line) => {
      const normalized = line.toUpperCase();
      return normalized.includes(" STE ") || normalized.includes("SUITE");
    });

  /**
   * Highlights address fieldsets that are likely to span two labels,
   * or include a PO BOX away from the start of a line.
   */
  const highlightTwoLabelAddresses = () => {
    const legendSpans = document.querySelectorAll("fieldset legend span");
    legendSpans.forEach((span) => {
      const label = span.textContent.trim();
      if (label !== "Mailing" && label !== "Residential") return;

      const fieldset = span.closest("fieldset");
      if (!fieldset) return;

      const textarea = fieldset.parentElement?.querySelector(
        "textarea[id^='patron-address-copy-']",
      );
      if (!textarea) return;

      const addressText = textarea.value || "";
      const needsTwoLabels =
        countPrintedLines(addressText) > 4 ||
        hasPOBoxAwayFromLineStart(addressText) ||
        hasSuiteIndicator(addressText);
      fieldset.style.backgroundColor = needsTwoLabels ? "#fffde7" : "";
    });
  };

  await waitForElementWithInterval(() =>
    document.querySelector("fieldset legend span"),
  );
  highlightTwoLabelAddresses();
})();
