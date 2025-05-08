async function loadFrequentLending() {
  const { frequentLibraries } = await import(
    chrome.runtime.getURL("../modules/frequentLibraries.js")
  );
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );
  const { buttonStyles, hoverStyles, waitForElementWithInterval } =
    await import(chrome.runtime.getURL("modules/utils.js"));

  function frequentLending() {
    const isEvergreen =
      window.location.href.includes("evgclient") ||
      window.location.href.includes("evgmobile");

    if (!isEvergreen) return;

    // -- Hide frequent lending buttons when printing --
    function injectPrintStyles() {
      if (document.getElementById("frequentLibrariesPrintStyle")) return;
      const style = document.createElement("style");
      style.id = "frequentLibrariesPrintStyle";
      style.textContent = `
      @media print {
        #frequentLibraries {
          display: none !important;
        }
      }
    `;
      document.head.appendChild(style);
    }

    const checkNavBar = async () => {
      let navBar = await waitForElementWithInterval("eg-staff-nav-bar");
      if (!navBar) {
        console.log("No navBar found.");
        return;
      }
      if (!document.querySelector("#frequentLibraries")) {
        generateLendingContainer(navBar);
      }
    };

    const copyValuetoInput = (value) => {
      let barcodeInput;
      let isSearchScreen = document.querySelector("#barcode-search-input");
      // #patron-barcode is ID on place hold screen, #barcode-search-input is ID on patron search screen
      barcodeInput =
        document.querySelector("#patron-barcode") ||
        document.querySelector("#barcode-search-input");

      // If no barcode input, copy the value to the clipboard
      if (!barcodeInput) {
        navigator.clipboard.writeText(value);
        statusModal(
          "Copied to clipboard!",
          `We didn't find anywhere to insert the patron barcode, so we copied it to your clipboard.`,
          "#4CAF50",
          chrome.runtime.getURL("images/kawaii-dinosaur.png")
        );
        return;
      }
      barcodeInput.value = value;
      const event = new Event("input", {
        bubbles: true,
        cancelable: true,
      });
      barcodeInput.dispatchEvent(event);
      barcodeInput.focus();

      // If on search screen, automatically click the search button
      if (isSearchScreen) {
        const searchButton = document.querySelector(
          ".input-group > .input-group-text > button"
        );
        searchButton.click();
      }
    };

    const generateButton = (containerEl, library) => {
      const libraryButton = document.createElement("button");
      libraryButton.textContent = library;
      libraryButton.value = frequentLibraries[library];

      Object.assign(libraryButton.style, buttonStyles);

      libraryButton.addEventListener("click", (e) => {
        copyValuetoInput(e.target.value);
      });
      libraryButton.addEventListener("mouseover", () => {
        Object.assign(libraryButton.style, hoverStyles);
      });
      libraryButton.addEventListener("mouseout", () => {
        Object.assign(libraryButton.style, buttonStyles);
      });
      containerEl.appendChild(libraryButton);
    };

    const generateLendingContainer = (navBar) => {
      if (document.querySelector("#frequentLibraries")) {
        return;
      }
      injectPrintStyles();
      const frequentLibrariesDiv = document.createElement("div");
      frequentLibrariesDiv.id = "frequentLibraries";

      const divStyles = {
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
      };

      Object.assign(frequentLibrariesDiv.style, divStyles);

      for (const library in frequentLibraries) {
        generateButton(frequentLibrariesDiv, library);
      }
      navBar.insertAdjacentElement("afterend", frequentLibrariesDiv);
    };

    checkNavBar();
  }

  frequentLending();
}

chrome.storage.local.get("lendingMode", (result) => {
  if (result.lendingMode) {
    loadFrequentLending();
  } else {
    const frequentLibraries = document.querySelector("#frequentLibraries");
    frequentLibraries ? frequentLibraries.remove() : null;
  }
});
