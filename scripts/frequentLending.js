async function loadFrequentLending() {
  const { frequentLibraries } = await import(
    chrome.runtime.getURL("../modules/frequentLibraries.js")
  );
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );
  const { applyStyles } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  function frequentLending() {
    const isEvergreen =
      window.location.href.includes("evgclient") ||
      window.location.href.includes("evgmobile");

    if (!isEvergreen) return;

    const doNotPrintNavBar = () => {
      // Nobody needs to see the frequent lending buttons when printing. That's madness.
      const style = document.createElement("style");
      style.textContent = `
        @media print {
          #frequentLibraries {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(style);
    };

    const checkNavBar = () => {
      let navBar = document.querySelector("eg-staff-nav-bar");
      if (navBar) {
        if (!document.querySelector("#frequentLibraries")) {
          generateLendingContainer(navBar);
        }
      } else {
        // If no navBar yet, keep trying for 15 seconds
        let attempts = 0;
        const interval = setInterval(() => {
          navBar = document.querySelector("eg-staff-nav-bar");
          if (navBar) {
            clearInterval(interval);
            generateLendingContainer(navBar);
          }
          attempts++;
          if (attempts > 30) {
            console.log("No navBar found");
            clearInterval(interval);
          }
        }, 500);
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
          `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Copied to clipboard!</h2> <p style="font-size: 1rem;">We didn't find anywhere to insert the patron barcode, so we copied it to your clipboard.</p>`,
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

      const buttonStyles = {
        margin: "0.5em",
        padding: "0.6em 1.2em",
        border: "1px solid #ccc",
        borderRadius: "8px",
        background: "linear-gradient(135deg, #f5f7fa 0%, #e2e6ea 100%)", // Subtle gray gradient
        color: "#222",
        cursor: "pointer",
        fontSize: "0.65rem",
        fontWeight: "bold",
        fontFamily: "Arial, sans-serif",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        letterSpacing: "0.03em",
        transition: "background 0.2s, transform 0.15s, box-shadow 0.2s",
        outline: "none",
        transform: "none",
      };

      const hoverStyles = {
        ...buttonStyles,
        background: "linear-gradient(135deg, #e2e6ea 0%, #f5f7fa 100%)", // Reverse subtle gradient
        boxShadow: "0 4px 16px rgba(0,0,0,0.13)",
        transform: "translateY(-2px) scale(1.04)",
      };

      applyStyles(libraryButton, buttonStyles);

      libraryButton.addEventListener("click", (e) => {
        copyValuetoInput(e.target.value);
      });
      libraryButton.addEventListener("mouseover", () => {
        applyStyles(libraryButton, hoverStyles);
      });
      libraryButton.addEventListener("mouseout", () => {
        applyStyles(libraryButton, buttonStyles);
      });
      containerEl.appendChild(libraryButton);
    };

    const generateLendingContainer = (navBar) => {
      if (document.querySelector("#frequentLibraries")) {
        return;
      }
      doNotPrintNavBar();
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
        paddingTop: "10px",
      };

      applyStyles(frequentLibrariesDiv, divStyles);

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
