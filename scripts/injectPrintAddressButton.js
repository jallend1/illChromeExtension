(async () => {
  const { waitForElementWithInterval, createMiniModal } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  const { dymoFunctions } = await import(
    chrome.runtime.getURL("modules/dymoFunctions.js")
  );

  const patronNameElement = await waitForElementWithInterval(
    ".patron-summary-container > .patron-status-color"
  );

  const createButton = () => {
    const printButton = document.createElement("button");
    printButton.innerText = "Print (ILL Remix)";
    printButton.id = "jason-print-button";
    return printButton;
  };

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

  const addContainerToDOM = () => {
    const printButton = createButton();
    const container = createContainer();
    container.appendChild(printButton);
    patronNameElement.after(container);

    printButton.addEventListener("click", async () => {
      const address = await waitForElementWithInterval(
        '[id^="patron-address-copy-"]'
      );
      createMiniModal("Printing address label...");
      dymoFunctions.printDymoLabel(address.textContent);
    });
  };

  const jasonsButton = document.querySelector("#jason-print-button");
  if (!jasonsButton) {
    addContainerToDOM();
  }
})();
