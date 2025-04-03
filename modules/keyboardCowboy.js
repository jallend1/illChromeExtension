export const keyboardCowboy = () => {
  const mainSection = document.querySelector("main");

  const removeTooltip = () => {
    const tooltip = document.querySelector("#keyboard-cowboy-tooltip");
    tooltip.remove();
  };

  const checkExistingTooltip = () => {
    const existingTooltip = document.querySelector("#keyboard-cowboy-tooltip");
    if (existingTooltip) {
      removeTooltip();
    }
  };

  const addTooltip = () => {
    const tooltip = document.createElement("div");
    tooltip.id = "keyboard-cowboy-tooltip";
    tooltip.style.margin = "1rem 1rem 0 auto";
    tooltip.style.padding = "1rem";

    tooltip.style.textAlign = "center";
    tooltip.style.width = "300px";
    tooltip.style.backgroundColor = "#fff3cd";
    tooltip.style.border = "1px solid #e9ecef";
    tooltip.style.borderRadius = "0.25rem";
    tooltip.style.zIndex = "1000";

    const header = document.createElement("header");
    const headerText = document.createElement("h2");
    headerText.textContent = "Be a keyboard cowboy!";
    header.appendChild(headerText);

    const main = document.createElement("main");
    main.style.display = "flex";
    main.style.flexDirection = "row";

    const img = document.createElement("img");
    img.src = chrome.runtime.getURL("images/cowboy.png");
    img.style.height = "100px";
    img.style.width = "100px";
    img.style.marginRight = "10px";

    const p = document.createElement("p");
    p.style.color = "#000";
    p.innerHTML = `Press <span style="font-weight:bold;">Ctrl+Enter</span> after entering the patron barcode to submit this hold without ever touching your mouse!`;
    main.appendChild(img);
    main.appendChild(p);

    tooltip.appendChild(header);
    tooltip.appendChild(main);

    mainSection.parentElement.insertBefore(tooltip, mainSection);
  };
  checkExistingTooltip();
  addTooltip();
};
