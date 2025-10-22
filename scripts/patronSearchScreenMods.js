// Adds button to patron search screen to limit search to only patron type of "Interlibrary Loan"
(async () => {
  const createPatronTypeCheckbox = () => {
    const checkboxDiv = document.createElement("div");
    checkboxDiv.id = "ill-patron-type-checkbox-div";
    checkboxDiv.style.marginTop = "10px";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "ill-patron-type-checkbox";
    checkbox.checked = true;

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.appendChild(document.createTextNode("Interlibrary Loan"));

    checkboxDiv.appendChild(checkbox);
    checkboxDiv.appendChild(label);

    return checkboxDiv;
  };

  const insertCheckbox = () => {
    const resetButton = document.querySelector(".btn-warning");
    if (
      resetButton &&
      !document.querySelector("#ill-patron-type-checkbox-div")
    ) {
      // TODO: Not really where I want it, but will do for now
      const checkboxDiv = createPatronTypeCheckbox();
      resetButton.parentNode.insertBefore(checkboxDiv, resetButton.nextSibling);
    }
  };

  insertCheckbox();
})();
