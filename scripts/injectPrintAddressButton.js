(async () => {
  const { waitForElementWithInterval, buttonStyles, hoverStyles } =
    await import(chrome.runtime.getURL("modules/utils.js"));

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
    // const buttonStyles = {
    //   backgroundColor: "#007bff",
    //   color: "#fff",
    //   border: "none",
    //   padding: "10px 20px",
    //   borderRadius: "5px",
    //   cursor: "pointer",
    //   fontSize: "16px",
    //   fontWeight: "bold",
    //   textAlign: "center",
    //   textDecoration: "none",
    //   display: "inline-block",
    //   margin: "4px 2px",
    //   transitionDuration: "0.4s",
    //   boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
    // };
    // Object.assign(printButton, buttonStyles);
    Object.assign(printButton.style, buttonStyles);
    Object.assign(printButton.style, hoverStyles);
    // printButton.className = "btn btn-primary";
    // printButton.style.marginLeft = "10px";
    // printButton.style.backgroundColor = "#007bff";
    // printButton.style.color = "#fff";
    // printButton.style.border = "none";
    // printButton.style.padding = "5px 10px";
    // printButton.style.borderRadius = "5px";

    return printButton;
  };

  const createContainer = () => {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.marginTop = "10px";
    container.style.marginBottom = "10px";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";
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
      console.log(address.textContent);
      dymoFunctions.printDymoLabel(address.textContent);
    });
  };

  const jasonsButton = document.querySelector("#jason-print-button");
  if (!jasonsButton) {
    addContainerToDOM();
  }
})();
