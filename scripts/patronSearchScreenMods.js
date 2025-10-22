// Adds button to patron search screen to limit search to only patron type of "Interlibrary Loan"
(async () => {
  
  const createPatronTypeCheckbox = () => {
    const checkboxDiv = document.createElement("div");
    checkboxDiv.id = "ill-patron-type-checkbox-div";
    checkboxDiv.style.margin = "10px";
    checkboxDiv.style.display = "inline-flex";
    checkboxDiv.style.alignItems = "center";
    checkboxDiv.style.gap = "5px";
    checkboxDiv.style.width = "100%";
    checkboxDiv.style.justifyContent = "flex-end";
    
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "ill-patron-type-checkbox";
    checkbox.checked = true;

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.appendChild(document.createTextNode("Limit to Interlibrary Loan"));

    checkboxDiv.appendChild(checkbox);
    checkboxDiv.appendChild(label);

    return checkboxDiv;
  };

  const insertCheckbox = () => {
    const patronSearchElement = document.querySelector('eg-patron-search');
    if (
      patronSearchElement &&
      !document.querySelector("#ill-patron-type-checkbox-div")
    ) {
      const checkboxDiv = createPatronTypeCheckbox();
      patronSearchElement.parentNode.insertBefore(
        checkboxDiv,
        patronSearchElement
      );
      
    }
  };

  const observer = new MutationObserver(() => {
    insertCheckbox();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  insertCheckbox();
})();
