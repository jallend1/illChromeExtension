async function loadFrequentLending() {
  const { frequentLibraries } = await import(
    chrome.runtime.getURL("../modules/frequentLibraries.js")
  );
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modals.js")
  );
  const { buttonStyles, hoverStyles, waitForElementWithInterval } =
    await import(chrome.runtime.getURL("modules/utils.js"));

  /**
   * Checks if the current page is an Evergreen client page
   * @returns {boolean} True if the current page is an Evergreen client page
   */
  const isEvergreenPage = () => {
    const url = window.location.href;
    return url.includes("evgclient") || url.includes("evgmobile");
  };

  /**
   * Injects styles to hide the frequent libraries section when printing
   * @returns {void}
   */
  const injectPrintStyles = () => {
    if (document.getElementById("frequentLibrariesPrintStyle")) return;
    const style = document.createElement("style");
    style.id = "frequentLibrariesPrintStyle";
    style.textContent = `@media print { #frequentLibraries { display: none !important; } }`;
    document.head.appendChild(style);
  };

  /**
   * Handles inputting the barcode into the appropriate field or copying to clipboard
   * @param {string} value - The barcode value to input or copy
   * @returns {void}
   */
  const handleBarcodeInput = (value) => {
    const barcodeInput =
      document.querySelector("#patron-barcode") ||
      document.querySelector("#barcode-search-input");
    const isSearchScreen = document.querySelector("#barcode-search-input");

    if (!barcodeInput) {
      // Store the current patron barcode in local storage and opens a new tab to retrieve patron
      const currentPatron = value;
      chrome.storage.local.set({ patronToEdit: currentPatron });
      chrome.runtime.sendMessage(
        { action: "editPatron", patronBarcode: currentPatron },
        (response) => {
          if (response.success) {
            console.log("Patron info retrieved successfully:", response.data);
          } else {
            console.error("Failed to retrieve patron info:", response.error);
          }
        }
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

  /**
   * Creates a button for the specified library and appends it to the container
   * @param {string} library - The name of the library
   * @param {HTMLElement} container - The container to append the button to
   */
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

  /**
   * Creates a close button for the frequent libraries section
   * @param {HTMLElement} container - The container to append the close button to
   * @return {void}
   */
  const createCloseButton = (container) => {
    const closeButton = document.createElement("button");
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "Close frequent lending toolbar");
    Object.assign(closeButton.style, {
      background: "#f1f5f9",
      border: "1px solid #e2e8f0",
      borderRadius: "6px",
      width: "24px",
      height: "24px",
      fontSize: "1.1rem",
      lineHeight: "1",
      cursor: "pointer",
      color: "#64748b",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s ease",
    });

    closeButton.addEventListener("click", () => {
      chrome.storage.local.set({ lendingMode: false });
      container.remove();
    });

    closeButton.addEventListener("mouseover", () => {
      Object.assign(closeButton.style, {
        background: "#ef4444",
        color: "#ffffff",
        borderColor: "#dc2626",
        transform: "scale(1.05)",
      });
    });

    closeButton.addEventListener("mouseout", () => {
      Object.assign(closeButton.style, {
        background: "#f1f5f9",
        color: "#64748b",
        borderColor: "#e2e8f0",
        transform: "scale(1)",
      });
    });

    container.appendChild(closeButton);
  };

  /**
   * Sets up the frequent lending section on the page
   * @returns {Promise<void>} A promise that resolves when the setup is complete
   */
  const setupFrequentLending = async () => {
    // Check if script has already run using data attribute
    if (!isEvergreenPage() || document.body.dataset.frequentLendingLoaded)
      return;

    document.body.dataset.frequentLendingLoaded = "true";

    const navBar = await waitForElementWithInterval("eg-staff-nav-bar");
    if (!navBar) return;

    injectPrintStyles();

    const container = document.createElement("div");
    container.id = "frequentLibraries";
    Object.assign(container.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      border: "1px solid #e2e8f0",
      background: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)",
      borderRadius: "12px",
      marginTop: "35px",
      padding: "1.25rem 1.5rem",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)",
      transition: "box-shadow 0.2s ease",
    });

    const buttonsContainer = document.createElement("div");
    Object.assign(buttonsContainer.style, {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "center",
      gap: "0.35rem",
      flex: "1",
    });

    Object.keys(frequentLibraries).forEach((library) =>
      createLibraryButton(library, buttonsContainer)
    );

    const closeButtonContainer = document.createElement("div");
    Object.assign(closeButtonContainer.style, {
      width: "30px",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      flexShrink: "0",
    });

    container.appendChild(buttonsContainer);
    container.appendChild(closeButtonContainer);
    createCloseButton(closeButtonContainer);
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
