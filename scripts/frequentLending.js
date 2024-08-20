function frequentLending() {
  const frequentLibraries = {
    Pierce: "000000000",
    SPL: "111111111",
    Whatcom: "222222222",
    Timberland: "333333333",
    "Spokane County": "444444444",
    "Spokane Public": "555555555",
    Kitsap: "666666666",
    "Sno-Isle": "777777777",
    "Walla Walla County": "888888888",
    "North Central": "999999999",
    "Coeur d'Alene": "101010101",
  };

  const applyStyles = (element, styles) => {
    for (const style in styles) {
      element.style[style] = styles[style];
    }
  };

  const searchForm = document.querySelector("eg-catalog-search-form");

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

  const generateButtons = (containerEl, library) => {
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
      //   libraryButton.style = hoverStyle;
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
    };

    applyStyles(frequentLibrariesDiv, divStyles);

    for (const library in frequentLibraries) {
      generateButtons(frequentLibrariesDiv, library);
    }
    searchForm.append(frequentLibrariesDiv);
  };

  if (searchForm) {
    if (!document.querySelector("#frequentLibraries")) {
      generateLendingContainer();
    }
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.data === "frequentLending") {
    frequentLending();
  }
});
