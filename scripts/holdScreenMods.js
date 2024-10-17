console.log("Heck yeah here we are");

function holdScreenMods() {
  // Ugly, but most reliable selector for the search button
  const searchButton = document.querySelector(
    "button > span.align-middle"
  ).parentElement;
  const searchButtonDiv = searchButton.parentElement;

  const createButton = () => {
    const newButton = document.createElement("button");
    newButton.type = "button";
    newButton.classList.add("btn", "btn-outline-dark", "btn-sm");
    const newSpan = createSpanText();
    newButton.appendChild(newSpan);
    newButton.addEventListener("click", () => {
      const currentPatron = document.querySelector("#patron-barcode").value;
      console.log(currentPatron);
    });
    return newButton;
  };

  const createContainerDiv = () => {
    const containerDiv = document.createElement("div");
    containerDiv.appendChild(createButton());
    containerDiv.classList.add("col-lg-2");
    return containerDiv;
  };

  const createSpanText = () => {
    const newSpan = document.createElement("span");
    newSpan.classList.add("align-middle");
    newSpan.textContent = "Edit Selected Patron";
    return newSpan;
  };

  searchButtonDiv.parentElement.appendChild(createContainerDiv());
}

function sendMessageToBackground() {
  const urlSuffix = `search?org=1&limit=10&query=${searchQuery}%20&fieldClass=keyword&joinOp=&matchOp=contains&dateOp=is&ridx=122`;
  chrome.runtime.sendMessage({ action: "holdScreenMods", url: urlSuffix });
}

holdScreenMods();
