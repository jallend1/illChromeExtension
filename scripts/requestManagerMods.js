(async () => {
  console.log("Request Manager Mods script starting...");
  if (!window.requestManagerModsInjected) {
    const { waitForElementWithInterval } = await import(
      chrome.runtime.getURL("modules/utils.js")
    );
    window.requestManagerModsInjected = true;
    window.gridItemsLength = 0;
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

    const staffNotesStyle = document.createElement("style");
    staffNotesStyle.textContent = `div.eg-grid-body-row.snf-hidden { display: none !important; }`;
    document.head.appendChild(staffNotesStyle);

    function applyStaffNotesFilter() {
      const checkbox = document.querySelector("#staff-notes-filter-checkbox");
      if (!checkbox) return;

      const rows = document.querySelectorAll("div.eg-grid-body-row");

      if (!checkbox.checked) {
        rows.forEach((row) => row.classList.remove("snf-hidden"));
        return;
      }

      const headers = Array.from(
        document.querySelectorAll('div[role="columnheader"]'),
      );
      const colIndex = headers.findIndex((header) =>
        Array.from(header.querySelectorAll("span")).some(
          (span) => span.textContent.trim() === "Staff Notes",
        ),
      );

      if (colIndex === -1) return;

      rows.forEach((row) => {
        const cells = row.querySelectorAll('div[role="gridcell"]');
        const staffNotesCell = cells[colIndex];
        const hasNote =
          staffNotesCell &&
          Array.from(staffNotesCell.querySelectorAll("span")).some(
            (span) => span.textContent.trim() !== "",
          );
        row.classList.toggle("snf-hidden", hasNote);
      });
    }

    function applyBlankIllFilter() {
      const checkbox = document.querySelector("#blank-ill-filter-checkbox");
      if (!checkbox) return;

      const rows = document.querySelectorAll("div.eg-grid-body-row");

      if (!checkbox.checked) {
        rows.forEach((row) => (row.style.display = ""));
        return;
      }

      const headers = Array.from(
        document.querySelectorAll('div[role="columnheader"]'),
      );
      const colIndex = headers.findIndex((header) =>
        Array.from(header.querySelectorAll("span")).some(
          (span) => span.textContent.trim() === "ILL Number",
        ),
      );

      if (colIndex === -1) return;

      rows.forEach((row) => {
        const cells = row.querySelectorAll('div[role="gridcell"]');
        const illCell = cells[colIndex];
        const hasValue =
          illCell &&
          Array.from(illCell.querySelectorAll("span")).some(
            (span) => span.textContent.trim() !== "",
          );
        row.style.display = hasValue ? "none" : "";
      });
    }

    const insertStaffNotesFilter = async () => {
      if (document.querySelector("#staff-notes-filter-container")) return;
      const staffBanner = await waitForElementWithInterval(() =>
        document.querySelector("eg-staff-banner"),
      );

      const container = document.createElement("div");
      container.id = "staff-notes-filter-container";
      container.style.textAlign = "right";
      container.style.padding = "4px 10px";

      const label = document.createElement("label");
      label.style.cursor = "pointer";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = "staff-notes-filter-checkbox";
      checkbox.style.marginRight = "5px";
      checkbox.addEventListener("change", applyStaffNotesFilter);

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode("Hide rows with Staff Notes"));
      container.appendChild(label);
      staffBanner.insertAdjacentElement("beforebegin", container);
    };

    // Apply highlighting to Outreach and ADA profile types
    const highlightProfileTypes = async () => {
      const gridItems = await waitForElementWithInterval(() => {
        const elements = document.querySelectorAll("eg-grid-body-cell");
        return elements.length > 0 ? elements : null;
      });
      applyStaffNotesFilter();
      applyBlankIllFilter();
      // console.log("Grid items length", gridItems.length);
      if (gridItems.length === window.gridItemsLength) {
        // No change in grid items, skip highlighting
        return;
      }
      // Update the global variable to the current grid length
      window.gridItemsLength = gridItems.length;
      // const matchingItems = [];
      gridItems.forEach((item) => {
        const spans = item.querySelectorAll(
          'span[tooltipclass="eg-grid-tooltip"]',
        );
        spans.forEach((span) => {
          if (
            span.textContent.includes("Outreach") ||
            span.textContent.includes("ADA Circulation")
          ) {
            item.style.backgroundColor = "#ffeb3b";
            // matchingItems.push(item);
          }
        });
      });
    };

    const insertBlankIllFilter = async () => {
      if (document.querySelector("#blank-ill-filter-container")) return;
      const staffBanner = await waitForElementWithInterval(() =>
        document.querySelector("eg-staff-banner"),
      );

      const container = document.createElement("div");
      container.id = "blank-ill-filter-container";
      container.style.textAlign = "right";
      container.style.padding = "4px 10px";

      const label = document.createElement("label");
      label.style.cursor = "pointer";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = "blank-ill-filter-checkbox";
      checkbox.style.marginRight = "5px";
      checkbox.addEventListener("change", applyBlankIllFilter);

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode("Show Only Blank ILL"));
      container.appendChild(label);
      staffBanner.insertAdjacentElement("beforebegin", container);
    };

    /**
     * Watches for the addition of a modal element.
     */
    function watchForModal() {
      modalObserver = new MutationObserver((mutationsList, observer) => {
        highlightProfileTypes();
        const modal = document.querySelector(".modal-dialog.modal-xl");
        if (modal) {
          const modalHeader = document.querySelector(
            ".modal-content > .modal-header",
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

            // Create the "Send Patron Info to WorldShare" button
            const sendPatronButton = document.createElement("button");
            sendPatronButton.textContent = "Send Patron Info to WorldShare";
            applyButtonStyles(sendPatronButton, "#6f42c1");
            sendPatronButton.addEventListener("click", () => {
              chrome.runtime.sendMessage({
                command: "sendPatronToWorldShare",
                data: "sendPatronToWorldShare",
              });
            });

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

            function getModalFields() {
              const modalBody =
                "body > ngb-modal-window > div > div > div.modal-body.form-validated";
              return {
                isbn: document.querySelector(
                  `${modalBody} > div:nth-child(5) > div:nth-child(2) > input`,
                ),
                title: document.querySelector(
                  `${modalBody} > div:nth-child(2) > div.col-10 > input`,
                ),
                author: document.querySelector(
                  `${modalBody} > div:nth-child(4) > div:nth-child(4) > input`,
                ),
              };
            }

            // Create the "Search Amazon" button
            const searchButton = document.createElement("button");
            searchButton.textContent = "Search Amazon";
            applyButtonStyles(searchButton, "#28a745");
            searchButton.addEventListener("click", () => {
              const {
                isbn,
                title: titleField,
                author: authorField,
              } = getModalFields();
              let searchTerm;
              if (isbn && isbn.value.trim() !== "") {
                searchTerm = isbn.value.trim();
              } else {
                const title = titleField ? titleField.value.trim() : "";
                const author = authorField ? authorField.value.trim() : "";
                searchTerm = `${title} ${author}`.trim();
              }
              const amazonSearchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}`;
              window.open(amazonSearchUrl, "_blank");
            });

            // Create a button to copy Title and Author to clipboard
            const copyTitleAuthorButton = document.createElement("button");
            copyTitleAuthorButton.textContent = "Copy Title & Author";
            applyButtonStyles(copyTitleAuthorButton, "#17a2b8");

            copyTitleAuthorButton.addEventListener("click", () => {
              const { title: titleField, author: authorField } =
                getModalFields();
              const title = titleField ? titleField.value.trim() : "";
              const author = authorField ? authorField.value.trim() : "";
              const clipboardContent = `${title} ${author}`;
              navigator.clipboard
                .writeText(clipboardContent)
                .then(() => {
                  console.log(
                    "Title and Author copied to clipboard:",
                    clipboardContent,
                  );
                })
                .catch((err) => {
                  console.error("Failed to copy Title and Author:", err);
                });
            });

            // Create the "Search WorldShare" button
            const worldShareButton = document.createElement("button");
            worldShareButton.textContent = "Search WorldShare";
            applyButtonStyles(worldShareButton, "#ffc107");
            worldShareButton.addEventListener("click", () => {
              const {
                isbn,
                title: titleField,
                author: authorField,
              } = getModalFields();
              let searchTerm;
              if (isbn && isbn.value.trim() !== "") {
                searchTerm = isbn.value.trim();
              } else {
                const title = titleField ? titleField.value.trim() : "";
                const author = authorField ? authorField.value.trim() : "";
                searchTerm = `${title} ${author}`.trim();
              }
              chrome.storage.local.set(
                { worldShareSearchTerm: searchTerm },
                () => {
                  chrome.runtime.sendMessage({
                    type: "findAndSwitchToWorldShare",
                    scriptToRelaunch: "searchWorldShare",
                  });
                },
              );
            });

            // Append buttons to the container
            copyButtonContainer.appendChild(copyTitleAuthorButton);
            searchButtonContainer.appendChild(searchButton);
            searchButtonContainer.appendChild(worldShareButton);
            buttonContainer.appendChild(sendPatronButton);
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

    /**
     * Watches for the removal of a modal element.
     * @param {*} modal - The modal element to watch for removal.
     */
    function watchForModalRemoval(modal) {
      removalObserver = new MutationObserver((mutationsList, observer) => {
        if (!document.body.contains(modal)) {
          // Clears out patron data when modal is closed to prevent errors
          chrome.storage.local.remove("requestManagerPatron");
          observer.disconnect();
          watchForModal(); // Start watching for the next modal
        }
      });
      removalObserver.observe(targetNode, config);
    }

    const watchGridBody = async () => {
      const gridBody = await waitForElementWithInterval(() =>
        document.querySelector("eg-grid-body"),
      );

      let debounceTimer = null;
      const gridObserverConfig = { childList: true, subtree: true };
      const gridObserver = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          gridObserver.disconnect();
          applyStaffNotesFilter();
          applyBlankIllFilter();
          gridObserver.observe(gridBody, gridObserverConfig);
        }, 150);
      });

      gridObserver.observe(gridBody, gridObserverConfig);
    };

    watchForModal();
    highlightProfileTypes();
    insertStaffNotesFilter();
    insertBlankIllFilter();
    watchGridBody();
  }
})();
