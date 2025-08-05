async function loadFrequentLending() {
  const { frequentLibraries } = await import(
    chrome.runtime.getURL("../modules/frequentLibraries.js")
  );
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );
  const { buttonStyles, hoverStyles, waitForElementWithInterval } =
    await import(chrome.runtime.getURL("modules/utils.js"));

  // Check if on Evergreen page
  const isEvergreenPage = () => {
    const url = window.location.href;
    return url.includes("evgclient") || url.includes("evgmobile");
  };

  // Inject print styles
  const injectPrintStyles = () => {
    if (document.getElementById("frequentLibrariesPrintStyle")) return;
    const style = document.createElement("style");
    style.id = "frequentLibrariesPrintStyle";
    style.textContent = `@media print { #frequentLibraries { display: none !important; } }`;
    document.head.appendChild(style);
  };

  // Handle barcode input
  const handleBarcodeInput = (value) => {
    const barcodeInput =
      document.querySelector("#patron-barcode") ||
      document.querySelector("#barcode-search-input");
    const isSearchScreen = document.querySelector("#barcode-search-input");

    if (!barcodeInput) {
      navigator.clipboard.writeText(value);
      statusModal(
        "Copied to clipboard!",
        "We didn't find anywhere to insert the patron barcode, so we copied it to your clipboard.",
        "#4CAF50",
        chrome.runtime.getURL("images/kawaii-dinosaur.png")
      );
      return;
    }

    barcodeInput.value = value;
    barcodeInput.dispatchEvent(
      new Event("input", { bubbles: true, cancelable: true })
    );
    barcodeInput.focus();

    if (isSearchScreen) {
      document
        .querySelector(".input-group > .input-group-text > button")
        ?.click();
    }
  };

  // Create library button
  const createLibraryButton = (library, container) => {
    const button = document.createElement("button");
    button.textContent = library;
    button.value = frequentLibraries[library];
    Object.assign(button.style, buttonStyles);

    button.addEventListener("click", (e) => handleBarcodeInput(e.target.value));
    button.addEventListener("mouseover", () =>
      Object.assign(button.style, hoverStyles)
    );
    button.addEventListener("mouseout", () =>
      Object.assign(button.style, buttonStyles)
    );

    container.appendChild(button);
  };

  // Create close button
  const createCloseButton = (container) => {
    const closeButton = document.createElement("button");
    closeButton.textContent = "X";
    Object.assign(closeButton.style, {
      position: "absolute",
      top: "0",
      right: "0",
      background: "none",
      border: "none",
      fontSize: ".5rem",
      cursor: "pointer",
      color: "#333",
      padding: "0.5rem",
      margin: "0.5rem",
      zIndex: "9999",
    });

    closeButton.addEventListener("click", () => {
      chrome.storage.local.set({ lendingMode: false });
      container.remove();
    });

    container.appendChild(closeButton);
  };

  // Main setup function
  const setupFrequentLending = async () => {
    if (!isEvergreenPage() || document.querySelector("#frequentLibraries"))
      return;

    const navBar = await waitForElementWithInterval("eg-staff-nav-bar");
    if (!navBar) return;

    injectPrintStyles();

    const container = document.createElement("div");
    container.id = "frequentLibraries";
    Object.assign(container.style, {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "center",
      border: "1px solid #ccc",
      background: "linear-gradient(135deg, #f8fafc 0%, #e8f0ee 100%)",
      borderRadius: "5px",
      marginTop: "35px",
      paddingTop: "1rem",
      paddingBottom: "0.75rem",
      position: "relative",
    });

    Object.keys(frequentLibraries).forEach((library) =>
      createLibraryButton(library, container)
    );
    createCloseButton(container);
    navBar.insertAdjacentElement("afterend", container);
  };

  setupFrequentLending();
}

// Initialize based on storage
chrome.storage.local.get("lendingMode", (result) => {
  if (result.lendingMode) {
    loadFrequentLending();
  } else {
    document.querySelector("#frequentLibraries")?.remove();
  }
});
