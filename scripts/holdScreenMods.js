function holdScreenMods() {
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

  // If item has a second patron, automatically populate departmental card barcode
  const placeHoldOnKCLSCard = () => {
    const barcodeField = document.querySelector("#patron-barcode");
    barcodeField.value = "0040746158";
    const event = new Event("input", {
      bubbles: true,
      cancelable: true,
    });
    barcodeField.dispatchEvent(event);
    barcodeField.focus();
  };

  const addMutationObserver = () => {
    // Selects parent div of item record section
    let targetNode = document.querySelector(
      ".hold-records-list.common-form.striped-even"
    );
    if (!targetNode) {
      // If the target node is not found, try again for up to 15 seconds
      let counter = 0;
      const interval = setInterval(() => {
        counter++;
        targetNode = document.querySelector(
          ".hold-records-list.common-form.striped-even"
        );
        if (targetNode) {
          clearInterval(interval);
          addMutationObserver();
        }
        if (counter >= 15) {
          clearInterval(interval);
          console.log("Target node not found after 15 seconds. Exiting...");
        }
      }, 1000);
      return;
    }

    const handleMutationObserver = (mutationList, observer) => {
      for (const mutation of mutationList) {
        if (mutation.type === "childList") {
          if (mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              // Iterates through added nodes to isolate hold status message
              if (
                node.classList &&
                node.classList.contains("alert") &&
                node.classList.contains("p-1") &&
                node.classList.contains("ms-2")
              ) {
                // console.log(node.textContent);

                // TODO: Need example of maximum holds...I *THINK* it is "MAX_HOLDS" but who knows
                // If maximum number of holds, focus on Override button for user convenience
                if (node.textContent.includes("MAX_HOLDS")) {
                  let infoButtons = document.querySelectorAll(".btn.btn-info");
                  // If infoButtons is only one in length, try again for up to 15 seconds
                  if (infoButtons.length === 1) {
                    let counter = 0;
                    const interval = setInterval(() => {
                      counter++;
                      infoButtons = document.querySelectorAll(".btn.btn-info");
                      if (infoButtons.length > 1) {
                        clearInterval(interval);
                        for (const button of infoButtons) {
                          if (button.textContent.includes("Override")) {
                            button.focus();
                          }
                        }
                      }
                      if (counter >= 15) {
                        clearInterval(interval);
                      }
                    }, 1000);
                    return;
                  }
                }

                // TODO: Add logic to display solution for 'No available copies' message here
                // TODO: Uncomment this when 2nd patron is tracked
                // if (node.textContent.includes("Hold Succeeded")) {
                //   placeHoldOnKCLSCard();
                // }
              }
            }
          }
        }
      }
    };

    const observer = new MutationObserver(handleMutationObserver);
    const config = { childList: true, subtree: true };
    observer.observe(targetNode, config);
  };

  addMutationObserver();
}

holdScreenMods();

// ***********************************
// * Adds Edit Patron Button, but    *
// * unable to get patron ID through *
// * barcode at this time            *
// ***********************************
// const createEditPatronButton = () => {
// Ugly, but most reliable selector for the search button
//   const searchButton = document.querySelector(
//     "button > span.align-middle"
//   ).parentElement;
//   const searchButtonDiv = searchButton.parentElement;

//   const createButton = () => {
//     const newButton = document.createElement("button");
//     newButton.type = "button";
//     newButton.classList.add("btn", "btn-outline-dark", "btn-sm");
//     newButton.style.height = "100%";
//     const newSpan = createSpanText();
//     newButton.appendChild(newSpan);
//     newButton.addEventListener("click", () => {
//       const currentPatron = document.querySelector("#patron-barcode").value;
//       console.log(currentPatron);
//     });
//     return newButton;
//   };

//   const createContainerDiv = () => {
//     const containerDiv = document.createElement("div");
//     containerDiv.appendChild(createButton());
//     containerDiv.classList.add("col-lg-2");
//     return containerDiv;
//   };

//   const createSpanText = () => {
//     const newSpan = document.createElement("span");
//     newSpan.classList.add("align-middle");
//     newSpan.textContent = "Edit Selected Patron";
//     return newSpan;
//   };

//   searchButtonDiv.parentElement.appendChild(createContainerDiv());
// }

// function sendMessageToBackground() {
//   const urlSuffix = `search?org=1&limit=10&query=${searchQuery}%20&fieldClass=keyword&joinOp=&matchOp=contains&dateOp=is&ridx=122`;
//   chrome.runtime.sendMessage({ action: "holdScreenMods", url: urlSuffix });
// }
