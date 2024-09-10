async function loadFrequentLending() {
  const { frequentLibraries } = await import(
    chrome.runtime.getURL("../modules/frequentLibraries.js")
  );
  console.log(frequentLibraries);

  function frequentLending() {
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

    const applyStyles = (el, styles) => {
      for (const style in styles) {
        el.style[style] = styles[style];
      }
    };

    const copyValuetoInput = (value) => {
      let barcodeInput;
      // #patron-barcode is ID on place hold screen, #barcode-search-input is ID on patron search screen
      barcodeInput =
        document.querySelector("#patron-barcode") ||
        document.querySelector("#barcode-search-input");

      // If no barcode input, copy the value to the clipboard
      if (!barcodeInput) {
        navigator.clipboard.writeText(value);
        return;
      }
      barcodeInput.value = value;
      const event = new Event("input", {
        bubbles: true,
        cancelable: true,
      });
      barcodeInput.dispatchEvent(event);
      barcodeInput.focus();
    };

    const generateButton = (containerEl, library) => {
      const libraryButton = document.createElement("button");
      libraryButton.textContent = library;
      libraryButton.value = frequentLibraries[library];

      const buttonStyles = {
        margin: "0.5em",
        padding: "0.5em 0.5em",
        border: "1px solid black",
        borderRadius: "5px",
        backgroundColor: "white",
        color: "black",
        cursor: "pointer",
        fontSize: "0.9em",
      };

      const hoverStyles = {
        margin: "0.5em",
        padding: "0.5em 0.5em",
        border: "1px solid black",
        borderRadius: "5px",
        backgroundColor: "#076376",
        color: "white",
        fontSize: "0.9em",
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
      const frequentLibrariesDiv = document.createElement("div");
      frequentLibrariesDiv.id = "frequentLibraries";

      const divStyles = {
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: "1em",
        border: "1px solid #ccc",
        backgroundColor: "#f9f9f9",
        padding: "1em",
        borderRadius: "5px",
        marginTop: "40px",
        paddingTop: "15px",
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

// Check if page has been updated
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.data === "frequentLending") {
    loadFrequentLending();
    sendResponse({ status: "success" });
  } else if (request.data === "pageUpdated") {
    chrome.storage.local.get("lendingMode", (result) => {
      if (result.lendingMode) {
        loadFrequentLending();
      }
      sendResponse({ status: "success" });
    });
    return true;
  } else {
    // TODO: Commonly logging "illPageMods" here -- Unify message handling
    // console.log(request.data);
    sendResponse({ status: "Unknown Message" });
  }
});
