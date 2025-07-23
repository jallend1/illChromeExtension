// TODO: Clean up this madness!

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

    function applyButtonStyles(button, color = "#007bff") {
      button.style.marginRight = "10px";
      button.style.padding = "5px 10px";
      button.style.backgroundColor = color;
      button.style.color = "#fff";
      button.style.border = "none";
      button.style.borderRadius = "3px";
      button.style.cursor = "pointer";
    }

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

            // Create the "Search Amazon" button
            const searchButton = document.createElement("button");
            searchButton.textContent = "Search Amazon";
            applyButtonStyles(searchButton, "#28a745");
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
            applyButtonStyles(copyTitleAuthorButton, "#17a2b8");

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
            searchButtonContainer.appendChild(copyTitleAuthorButton);
            searchButtonContainer.appendChild(searchButton);
            buttonContainer.appendChild(copyButtonContainer);
            buttonContainer.appendChild(searchButtonContainer);
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
          // Clears out patron data when modal is closed to prevent errors
          chrome.storage.local.remove("requestManagerPatron");
          chrome.runtime.sendMessage({ type: "requestManagerPatronUpdated" });

          observer.disconnect();
          watchForModal(); // Start watching for the next modal
        }
      });
      removalObserver.observe(targetNode, config);
    }

    watchForModal();
  }
})();
