(async () => {
  console.log("Request Manager Mods script starting...");
  if (!window.requestManagerModsInjected) {
    const { waitForElementWithInterval } = await import(
      chrome.runtime.getURL("modules/utils.js")
    );
    window.requestManagerModsInjected = true;
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    let modalObserver = null;
    let removalObserver = null;

    function watchForModal() {
      modalObserver = new MutationObserver((mutationsList, observer) => {
        const modal = document.querySelector(".modal-dialog.modal-xl");
        if (modal) {
          console.log("We got one!", modal);
          const modalHeader = document.querySelector(
            ".modal-content > .modal-header"
          );
          if (modalHeader) {
            const buttonContainer = document.createElement("div");
            buttonContainer.style.display = "flex";
            // buttonContainer.style.justifyContent = "space-between";
            buttonContainer.style.margin = "10px";
            buttonContainer.style.padding = "10px";
            buttonContainer.style.backgroundColor = "#f8f9fa";
            buttonContainer.style.borderRadius = "5px";
            buttonContainer.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";

            // Create the "Copy Patron Name" button
            const copyButton = document.createElement("button");
            copyButton.textContent = "Copy Name for WorldShare";
            copyButton.style.marginRight = "10px";
            copyButton.style.padding = "5px 10px";
            copyButton.style.backgroundColor = "#007bff";
            copyButton.style.color = "#fff";
            copyButton.style.border = "none";
            copyButton.style.borderRadius = "3px";
            copyButton.style.cursor = "pointer";

            copyButton.addEventListener("click", () => {
              const patronNameField = document.querySelector(
                "div.modal-body.form-validated > div"
              ).children[1];
              const cleanPatronName = patronNameField.textContent
                .split("(")[0]
                .trim();
              // Extract pickup location to append to patron name
              const pickupLocation = document
                .querySelector(
                  "body > ngb-modal-window > div > div > div.modal-body.form-validated > div:nth-child(8) > div:nth-child(2)"
                )
                .textContent.split("(")[1]
                .split(")")[0]
                .trim();

              const worldShareName = cleanPatronName + ", " + pickupLocation;
              navigator.clipboard
                .writeText(worldShareName)
                .then(() => {
                  console.log(
                    "Patron name copied to clipboard:",
                    worldShareName
                  );
                })
                .catch((err) => {
                  console.error("Failed to copy patron name:", err);
                });
            });

            // Create the "Search Amazon" button
            const searchButton = document.createElement("button");
            searchButton.textContent = "Search Amazon";
            searchButton.style.padding = "5px 10px";
            searchButton.style.backgroundColor = "#28a745";
            searchButton.style.color = "#fff";
            searchButton.style.border = "none";
            searchButton.style.borderRadius = "3px";
            searchButton.style.cursor = "pointer";
            searchButton.addEventListener("click", () => {
              const patronName = modalHeader.textContent.trim();
              const amazonSearchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(
                patronName
              )}`;
              window.open(amazonSearchUrl, "_blank");
            });
            // Append buttons to the container
            buttonContainer.appendChild(copyButton);
            buttonContainer.appendChild(searchButton);
            // modalHeader.appendChild(buttonContainer);
            modalHeader.insertAdjacentElement("afterend", buttonContainer);
          }

          observer.disconnect();
          watchForModalRemoval(modal);
        }
      });
      modalObserver.observe(targetNode, config);
    }

    function watchForModalRemoval(modal) {
      removalObserver = new MutationObserver((mutationsList, observer) => {
        if (!document.body.contains(modal)) {
          console.log("Modal closed");
          observer.disconnect();
          watchForModal(); // Start watching for the next modal
        }
      });
      removalObserver.observe(targetNode, config);
    }

    watchForModal();
  }
})();
