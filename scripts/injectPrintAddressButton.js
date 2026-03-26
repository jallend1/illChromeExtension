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
    ".patron-summary-container > .patron-status-color"
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
        '[id^="patron-address-copy-"]'
      );
      if (!address) {
        createMiniModal("Could not find patron address — is it loaded on the page?", true);
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

  /**
   * Highlights address fieldsets that are likely to span two labels,
   * identified by containing "BOX" or "SUITE" in the address text.
   */
  const highlightTwoLabelAddresses = () => {
    const legendSpans = document.querySelectorAll("fieldset legend span");
    legendSpans.forEach((span) => {
      const label = span.textContent.trim();
      if (label !== "Mailing" && label !== "Residential") return;

      const fieldset = span.closest("fieldset");
      if (!fieldset) return;

      const needsTwoLabels = /\b(BOX|SUITE|STE)\b/i.test(fieldset.textContent);
      fieldset.style.backgroundColor = needsTwoLabels ? "#fffde7" : "";
    });
  };

  await waitForElementWithInterval(() =>
    document.querySelector("fieldset legend span")
  );
  highlightTwoLabelAddresses();
})();
