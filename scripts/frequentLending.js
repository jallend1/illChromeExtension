function frequentLending() {
  const frequentLibraries = {
    "Coeur d'Alene": "101010101",
    Kitsap: "666666666",
    "North Central": "999999999",
    Pierce: "000000000",
    SPL: "111111111",
    "Spokane County": "444444444",
    "Spokane Public": "555555555",
    "Sno-Isle": "777777777",
    Timberland: "333333333",
    "Walla Walla County": "888888888",
    Whatcom: "222222222",
  };

  const applyStyles = (el, styles) => {
    for (const style in styles) {
      el.style[style] = styles[style];
    }
  };

  const navBar = document.querySelector("eg-staff-nav-bar");

  const copyValuetoInput = (value) => {
    const barcodeInput = document.querySelector("#patron-barcode");
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

  const generateLendingContainer = () => {
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

  if (navBar) {
    if (!document.querySelector("#frequentLibraries")) {
      generateLendingContainer();
    }
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.data === "frequentLending") {
    frequentLending();
    sendResponse({ status: "success" });
  }
});
