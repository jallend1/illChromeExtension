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
          const modalHeader = document.querySelector(
            ".modal-content > .modal-header"
          );
          if (modalHeader) {
            if (document.querySelector("#request-manager-mods-buttons")) {
              return;
            }
            const buttonContainer = document.createElement("div");
            buttonContainer.id = "request-manager-mods-buttons";
            buttonContainer.style.display = "flex";
            buttonContainer.style.justifyContent = "space-between";
            buttonContainer.style.margin = "10px";
            buttonContainer.style.padding = "10px";
            buttonContainer.style.backgroundColor = "#f8f9fa";
            buttonContainer.style.borderRadius = "5px";
            buttonContainer.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";

            // Container for copy related actions
            const copyButtonContainer = document.createElement("div");
            copyButtonContainer.id = "request-manager-mods-copy-buttons";
            copyButtonContainer.style.display = "flex";
            copyButtonContainer.style.marginRight = "10px";

            // Container for search related actions
            const searchButtonContainer = document.createElement("div");
            searchButtonContainer.id = "request-manager-mods-search-buttons";
            searchButtonContainer.style.display = "flex";
            searchButtonContainer.style.marginRight = "10px";

            const copyPatronBarcodeButton = document.createElement("button");
            copyPatronBarcodeButton.textContent = "Copy Patron Barcode";
            copyPatronBarcodeButton.style.marginRight = "10px";
            copyPatronBarcodeButton.style.padding = "5px 10px";
            copyPatronBarcodeButton.style.backgroundColor = "#007bff";
            copyPatronBarcodeButton.style.color = "#fff";
            copyPatronBarcodeButton.style.border = "none";
            copyPatronBarcodeButton.style.borderRadius = "3px";
            copyPatronBarcodeButton.style.cursor = "pointer";
            copyPatronBarcodeButton.addEventListener("click", () => {
              const patronNameField = document.querySelector(
                "div.modal-body.form-validated > div"
              ).children[1];
              const cleanPatronName = patronNameField.textContent
                .split("(")[0]
                .trim();
              // TODO: Extract barcode from the patron name field but not used yet
              const barcode = patronNameField.textContent.match(/\((\d+)\)/)[1];
              navigator.clipboard
                .writeText(barcode)
                .then(() => {
                  console.log("Patron barcode copied to clipboard:", barcode);
                })
                .catch((err) => {
                  console.error("Failed to copy patron barcode:", err);
                });
            });

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
              // TODO: Extract barcode from the patron name field but not used yet
              const barcode = patronNameField.textContent.match(/\((\d+)\)/)[1];
              // Extract pickup location to append to patron name
              const pickupLocation = document
                .querySelector(
                  "body > ngb-modal-window > div > div > div.modal-body.form-validated > div:nth-child(8) > div:nth-child(2)"
                )
                .textContent.split("(")[1]
                .split(")")[0]
                .trim();

              const worldShareName = cleanPatronName + ", " + pickupLocation;
              // const clipboardContent = worldShareName + "\t" + barcode;
              navigator.clipboard
                .writeText(worldShareName)
                .then(() => {
                  console.log(
                    "Patron data copied to clipboard:",
                    worldShareName
                  );
                })
                .catch((err) => {
                  console.error("Failed to copy patron data:", err);
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
              let searchTerm;
              const isbnField = document.querySelector(
                "body > ngb-modal-window > div > div > div.modal-body.form-validated > div:nth-child(5) > div:nth-child(2) > input"
              );
              if (isbnField && isbnField.value.trim() !== "") {
                searchTerm = isbnField.value.trim();
              } else {
                const titleField = document.querySelector(
                  "body > ngb-modal-window > div > div > div.modal-body.form-validated > div:nth-child(2) > div.col-10 > input"
                );
                const authorField = document.querySelector(
                  "body > ngb-modal-window > div > div > div.modal-body.form-validated > div:nth-child(4) > div:nth-child(4) > input"
                );
                const title = titleField ? titleField.value.trim() : "";
                const author = authorField ? authorField.value.trim() : "";
                console.log("Title:", title, "Author:", author);
                searchTerm = `${title} ${author}`.trim();
              }
              const amazonSearchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(
                searchTerm
              )}`;
              window.open(amazonSearchUrl, "_blank");
            });

            // Create a button to copy Title and Author to clipboard
            const copyTitleAuthorButton = document.createElement("button");
            copyTitleAuthorButton.textContent = "Copy Title & Author";
            copyTitleAuthorButton.style.margin = "0 10px";
            copyTitleAuthorButton.style.padding = "5px 10px";
            copyTitleAuthorButton.style.backgroundColor = "#17a2b8";
            copyTitleAuthorButton.style.color = "#fff";
            copyTitleAuthorButton.style.border = "none";
            copyTitleAuthorButton.style.borderRadius = "3px";
            copyTitleAuthorButton.style.cursor = "pointer";

            copyTitleAuthorButton.addEventListener("click", () => {
              const titleField = document.querySelector(
                "body > ngb-modal-window > div > div > div.modal-body.form-validated > div:nth-child(2) > div.col-10 > input"
              );
              const authorField = document.querySelector(
                "body > ngb-modal-window > div > div > div.modal-body.form-validated > div:nth-child(4) > div:nth-child(4) > input"
              );
              const title = titleField ? titleField.value.trim() : "";
              const author = authorField ? authorField.value.trim() : "";
              const clipboardContent = `${title} ${author}`;
              navigator.clipboard
                .writeText(clipboardContent)
                .then(() => {
                  console.log(
                    "Title and Author copied to clipboard:",
                    clipboardContent
                  );
                })
                .catch((err) => {
                  console.error("Failed to copy Title and Author:", err);
                });
            });

            // Append buttons to the container
            copyButtonContainer.appendChild(copyButton);
            copyButtonContainer.appendChild(copyPatronBarcodeButton);
            searchButtonContainer.appendChild(copyTitleAuthorButton);
            searchButtonContainer.appendChild(searchButton);
            // buttonContainer.appendChild(copyButton);
            buttonContainer.appendChild(copyButtonContainer);
            buttonContainer.appendChild(searchButtonContainer);
            // buttonContainer.appendChild(searchButton);
            // buttonContainer.appendChild(copyTitleAuthorButton);
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
