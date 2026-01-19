import { elements } from "./constants.js";
import {
  parseMailData,
  toggleSection,
  initiateScript,
  addCheckboxListener,
} from "./utils.js";

/**
 * Sets up passive tools toggle listener
 */
const setupPassiveToolsListener = () => {
  if (!elements.passiveTools) return;

  elements.passiveTools.addEventListener("click", () => {
    chrome.storage.local.get("arePassiveToolsActive", (result) => {
      chrome.storage.local.set(
        { arePassiveToolsActive: !result.arePassiveToolsActive },
        () => {
          const newState = !result.arePassiveToolsActive;
          elements.passiveTools.checked = newState;
          chrome.runtime.sendMessage({ command: "toggleExtension" });
        }
      );
    });
  });
};

/**
 * Sets up ILL actions button listeners
 */
const setupIllActionsListeners = () => {
  if (!elements.illActions) return;

  elements.illActions.forEach((button) => {
    button.addEventListener("click", (event) => {
      initiateScript(event.target.id);
    });
  });
};

/**
 * Sets up collapse toggle listeners
 */
const setupCollapseToggleListeners = () => {
  if (!elements.collapseToggle) return;

  elements.collapseToggle.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const mainSection = toggle.parentElement.nextElementSibling;
      toggleSection(toggle, mainSection);
    });
  });
};

/**
 * Sets up other button listeners
 */
const setupButtonListeners = () => {
  // Disable button
  if (elements.disableButton) {
    elements.disableButton.addEventListener("click", () => {
      chrome.runtime.sendMessage({ command: "disableButton" });
    });
  }

  // Lending mode
  if (elements.lendingMode) {
    elements.lendingMode.addEventListener("click", () => {
      initiateScript("frequentLending");
      chrome.storage.local.set({
        lendingMode: elements.lendingMode.checked,
      });
    });
  }

  // Import mailroom data
  if (elements.importMailroomData) {
    elements.importMailroomData.addEventListener("click", async () => {
      try {
        const mailData = await parseMailData();
        if (mailData) {
          chrome.storage.local.set({ mailData: mailData.data });
          alert("Mailroom data imported successfully!");
        } else {
          alert("Failed to import mailroom data.");
        }
      } catch (error) {
        console.error("Error importing mailroom data:", error);
        alert("Failed to import mailroom data.");
      }
    });
  }
};

const setupBookPricingListeners = () => {
  const checkBookPriceBtn = document.getElementById("checkBookPrice");
  const bulkPriceCheckBtn = document.getElementById("bulkPriceCheck");
  const bulkPriceContainer = document.getElementById("bulk-price-container");
  const isbnInput = document.getElementById("isbn-input");
  const startBulkCheckBtn = document.getElementById("startBulkCheck");
  const cancelBulkCheckBtn = document.getElementById("cancelBulkCheck");
  const bulkProgress = document.getElementById("bulk-progress");
  const priceResults = document.getElementById("price-results");
  const priceOutput = document.getElementById("price-output");
  const copyResultsBtn = document.getElementById("copyResults");
  const clearResultsBtn = document.getElementById("clearResults");

  let isProcessing = false;
  let currentResults = [];

  if (checkBookPriceBtn) {
    checkBookPriceBtn.addEventListener("click", async () => {
      const searchTerm = prompt("Enter ISBN, title, or author to search:");
      if (!searchTerm || searchTerm.trim() === "") return;

      try {
        checkBookPriceBtn.disabled = true;
        checkBookPriceBtn.textContent = "Opening Kinokuniya...";

        console.log(`Opening Kinokuniya search for: "${searchTerm}"`);

        // Send message to background script to open the tab
        await chrome.runtime.sendMessage({
          command: "openKinokuniyaSearch",
          searchTerm: searchTerm.trim(),
        });
      } catch (error) {
        console.error("Failed to open Kinokuniya search:", error);
        alert("Failed to open search: " + error.message);
      } finally {
        checkBookPriceBtn.disabled = false;
        checkBookPriceBtn.textContent = "Check Book Price";
      }
    });
  }

  if (bulkPriceCheckBtn) {
    bulkPriceCheckBtn.addEventListener("click", () => {
      bulkPriceContainer.classList.toggle("hidden");
      if (!bulkPriceContainer.classList.contains("hidden")) {
        isbnInput.focus();
      }
    });
  }

  if (cancelBulkCheckBtn) {
    cancelBulkCheckBtn.addEventListener("click", () => {
      isProcessing = false;
      bulkPriceContainer.classList.add("hidden");
      bulkProgress.classList.add("hidden");
    });
  }

  if (startBulkCheckBtn) {
    startBulkCheckBtn.addEventListener("click", async () => {
      const isbnText = isbnInput.value.trim();
      if (!isbnText) {
        alert("Please paste some ISBNs first!");
        return;
      }

      // Parse ISBNs (split by newlines, filter empty lines)
      const isbns = isbnText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (isbns.length === 0) {
        alert("No valid ISBNs found!");
        return;
      }

      isProcessing = true;
      currentResults = [];
      bulkProgress.classList.remove("hidden");
      priceResults.classList.remove("hidden");
      priceOutput.innerHTML = "";
      startBulkCheckBtn.disabled = true;

      // Process each ISBN
      for (let i = 0; i < isbns.length && isProcessing; i++) {
        const isbn = isbns[i];
        document.getElementById("progress-text").textContent = `${i + 1}/${
          isbns.length
        }`;
        document.getElementById("current-isbn").textContent = isbn;
        document.getElementById("status-text").textContent = "Searching...";

        try {
          // Send message to background to open Kinokuniya and wait for result
          const result = await new Promise((resolve) => {
            const messageListener = (message) => {
              console.log("Sidepanel: Received message:", message);
              if (
                message.command === "kinokuniyaResult" &&
                message.isbn === isbn
              ) {
                console.log(`Sidepanel: Matched result for ISBN ${isbn}`);
                chrome.runtime.onMessage.removeListener(messageListener);
                resolve(message);
              }
            };
            chrome.runtime.onMessage.addListener(messageListener);
            console.log(`Sidepanel: Waiting for result for ISBN ${isbn}`);

            chrome.runtime.sendMessage({
              command: "openKinokuniyaSearch",
              searchTerm: isbn,
              bulkMode: true,
            });

            // Timeout after 30 seconds
            setTimeout(() => {
              chrome.runtime.onMessage.removeListener(messageListener);
              resolve({
                found: false,
                error: "Timeout",
              });
            }, 30000);
          });

          // Store result
          const resultEntry = {
            isbn: isbn,
            found: result.found,
            url: result.url || "",
            price: result.price || "",
            error: result.error || "",
          };
          currentResults.push(resultEntry);

          // Display result
          const resultDiv = document.createElement("div");
          resultDiv.style.cssText =
            "padding: 5px; margin: 5px 0; border: 1px solid #ccc; font-size: 12px;";
          if (result.found) {
            resultDiv.innerHTML = `
              <strong>${isbn}</strong><br/>
              Price: ${result.price}<br/>
              <a href="${result.url}" target="_blank">View Product</a>
            `;
            resultDiv.style.backgroundColor = "#d4edda";
          } else {
            resultDiv.innerHTML = `<strong>${isbn}</strong><br/>Not found${
              result.error ? ": " + result.error : ""
            }`;
            resultDiv.style.backgroundColor = "#f8d7da";
          }
          priceOutput.appendChild(resultDiv);

          document.getElementById("status-text").textContent = result.found
            ? "Found!"
            : "Not found";
        } catch (error) {
          console.error(`Error processing ISBN ${isbn}:`, error);
          currentResults.push({
            isbn: isbn,
            found: false,
            url: "",
            price: "",
            error: error.message,
          });
        }

        // Wait before next search (respect rate limits)
        if (i < isbns.length - 1 && isProcessing) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      document.getElementById("status-text").textContent = "Complete!";
      startBulkCheckBtn.disabled = false;
      isProcessing = false;
    });
  }

  if (copyResultsBtn) {
    copyResultsBtn.addEventListener("click", () => {
      // Format results as tab-separated for Excel
      const lines = currentResults.map((r) => {
        return `${r.isbn}\t${r.url}\t${r.price}`;
      });
      const text = lines.join("\n");

      navigator.clipboard.writeText(text).then(
        () => {
          alert("Results copied to clipboard! Paste into Excel.");
        },
        (err) => {
          console.error("Failed to copy:", err);
          alert("Failed to copy to clipboard.");
        }
      );
    });
  }

  if (clearResultsBtn) {
    clearResultsBtn.addEventListener("click", () => {
      currentResults = [];
      priceOutput.innerHTML = "";
      priceResults.classList.add("hidden");
      isbnInput.value = "";
    });
  }
};

/**
 * Sets up checkbox listeners
 */
const setupCheckboxListeners = () => {
  const checkboxes = [
    { element: elements.autoReceiveRequestButton, key: "autoReceiveRequest" },
    { element: elements.printLabel, key: "printLabel" },
    { element: elements.autoReturnILL, key: "autoReturnILL" },
  ];

  checkboxes.forEach(({ element, key }) => {
    addCheckboxListener(element, key);
  });
};

/**
 * Sets up keyboard shortcuts
 */
const setupKeyboardShortcuts = () => {
  document.addEventListener("DOMContentLoaded", () => {
    if (!chrome.commands) return;

    chrome.commands.getAll((commands) => {
      commands.forEach((cmd) => {
        if (cmd.shortcut) {
          const tooltip = document.querySelector(`#${cmd.name} .tooltiptext`);
          if (tooltip) {
            tooltip.textContent = `Press ${cmd.shortcut}`;
          }
        }
      });
    });
  });
};

/**
 * Initialize all event listeners
 */
export const initializeEventListeners = () => {
  setupPassiveToolsListener();
  setupIllActionsListeners();
  setupCollapseToggleListeners();
  setupButtonListeners();
  setupCheckboxListeners();
  setupKeyboardShortcuts();
  setupBookPricingListeners();
};
