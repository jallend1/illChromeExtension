/**
 * Book pricing functionality for Kinokuniya searches
 */

let isProcessing = false;
let currentResults = [];

/**
 * Sends current results to the modal on the active tab
 */
const showResultsInModal = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        command: "showPriceResults",
        results: currentResults,
      });
    }
  });
};

/**
 * Sets up bulk price check toggle button
 */
const setupBulkPriceToggle = (bulkPriceCheckBtn, bulkPriceContainer, isbnInput) => {
  if (!bulkPriceCheckBtn) return;

  bulkPriceCheckBtn.addEventListener("click", () => {
    bulkPriceContainer.classList.toggle("hidden");
    if (!bulkPriceContainer.classList.contains("hidden")) {
      isbnInput.focus();
    }
  });
};

/**
 * Sets up cancel bulk check button
 */
const setupCancelBulkCheck = (cancelBulkCheckBtn, bulkPriceContainer, bulkProgress) => {
  if (!cancelBulkCheckBtn) return;

  cancelBulkCheckBtn.addEventListener("click", () => {
    isProcessing = false;
    bulkPriceContainer.classList.add("hidden");
    bulkProgress.classList.add("hidden");
  });
};

/**
 * Waits for a Kinokuniya search result with timeout
 */
const waitForSearchResult = (isbn) => {
  return new Promise((resolve) => {
    const messageListener = (message) => {
      console.log("Sidepanel: Received message:", message);
      if (message.command === "kinokuniyaResult" && message.isbn === isbn) {
        console.log(`Sidepanel: Matched result for search term ${isbn}`);
        chrome.runtime.onMessage.removeListener(messageListener);
        resolve(message);
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);
    console.log(`Sidepanel: Waiting for result for search term ${isbn}`);

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
};

/**
 * Processes a single ISBN search
 */
const processIsbn = async (isbn) => {
  document.getElementById("current-isbn").textContent = isbn;
  document.getElementById("status-text").textContent = "Searching...";

  try {
    const result = await waitForSearchResult(isbn);

    // Determine which ISBN to use for the results
    // If original search term starts with "97", it's already an ISBN
    // Otherwise, use the extracted ISBN from the page
    let isbnForResults = "";
    if (isbn.startsWith("97")) {
      isbnForResults = isbn.replace(/-/g, "");
    } else if (result.extractedIsbn) {
      isbnForResults = result.extractedIsbn.replace(/-/g, "");
    }

    // Store result
    const resultEntry = {
      searchTerm: isbn,
      isbn: isbnForResults,
      found: result.found,
      url: result.url || "",
      price: result.price || "",
      error: result.error || "",
    };
    currentResults.push(resultEntry);

    document.getElementById("status-text").textContent = result.found
      ? "Found!"
      : "Not found";

    return resultEntry;
  } catch (error) {
    console.error(`Error processing ISBN ${isbn}:`, error);
    const errorEntry = {
      isbn: isbn,
      found: false,
      url: "",
      price: "",
      error: error.message,
    };
    currentResults.push(errorEntry);
    return errorEntry;
  }
};

/**
 * Sets up the start bulk check button
 */
const setupStartBulkCheck = (
  startBulkCheckBtn,
  isbnInput,
  bulkProgress
) => {
  if (!startBulkCheckBtn) return;

  startBulkCheckBtn.addEventListener("click", async () => {
    const isbnText = isbnInput.value.trim();
    if (!isbnText) {
      alert("Please paste some ISBNs first!");
      return;
    }

    // Parse lines (split by newlines, strip invisible chars and whitespace)
    const lines = isbnText
      .split("\n")
      .map((line) => line.replace(/[\u200E\u200F\u200B\u00A0\uFEFF]/g, "").trim());

    if (lines.every((line) => line.length === 0)) {
      alert("No valid ISBNs found!");
      return;
    }

    isProcessing = true;
    currentResults = [];
    bulkProgress.classList.remove("hidden");
    startBulkCheckBtn.disabled = true;

    // Process each line
    for (let i = 0; i < lines.length && isProcessing; i++) {
      document.getElementById("progress-text").textContent = `${i + 1}/${lines.length}`;

      if (lines[i].length === 0) {
        // Blank line - add as not found placeholder
        currentResults.push({
          searchTerm: "",
          isbn: "",
          found: false,
          url: "",
          price: "",
          error: "",
        });
        continue;
      }

      await processIsbn(lines[i]);

      // Wait before next search (respect rate limits)
      if (i < lines.length - 1 && isProcessing) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    document.getElementById("status-text").textContent = "Complete!";
    startBulkCheckBtn.disabled = false;
    isProcessing = false;

    // Show the last results controls
    const lastResultsControls = document.getElementById("last-results-controls");
    if (lastResultsControls) lastResultsControls.style.display = "flex";

    // Show results in modal on active tab
    showResultsInModal();
  });
};

/**
 * Sets up copy results button
 */
const setupCopyResults = (copyResultsBtn) => {
  if (!copyResultsBtn) return;

  copyResultsBtn.addEventListener("click", () => {
    // Build HTML table for Excel (preserves unique hyperlinks)
    const htmlRows = currentResults.map((r) => {
      const isbn13 = r.isbn && r.isbn.startsWith("97") ? r.isbn : "";
      const source = r.found ? "Kinokuniya" : "";
      const link = r.found && r.url ? `<a href="${r.url}">Link</a>` : "";
      return `<tr><td>${isbn13}</td><td>${r.searchTerm}</td><td>${r.price}</td><td>${source}</td><td></td><td>${link}</td></tr>`;
    });
    const html = `<table>${htmlRows.join("")}</table>`;

    // Build plain text fallback (tab-separated with raw URLs)
    const textLines = currentResults.map((r) => {
      const isbn13 = r.isbn && r.isbn.startsWith("97") ? r.isbn : "";
      const source = r.found ? "Kinokuniya" : "";
      const link = r.found && r.url ? r.url : "";
      return `${isbn13}\t${r.searchTerm}\t${r.price}\t${source}\t\t${link}`;
    });
    const text = textLines.join("\n");

    const htmlBlob = new Blob([html], { type: "text/html" });
    const textBlob = new Blob([text], { type: "text/plain" });

    navigator.clipboard.write([
      new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": textBlob,
      }),
    ]).then(
      () => {
        alert("Results copied to clipboard! Paste into Excel.");
      },
      (err) => {
        console.error("Failed to copy:", err);
        alert("Failed to copy to clipboard.");
      }
    );
  });
};

/**
 * Sets up show last results button
 */
const setupShowLastResults = (showLastResultsBtn) => {
  if (!showLastResultsBtn) return;

  showLastResultsBtn.addEventListener("click", () => {
    if (currentResults.length === 0) return;
    showResultsInModal();
  });
};

/**
 * Hides the last results controls and clears results data
 */
const hideLastResultsControls = () => {
  currentResults = [];
  const lastResultsControls = document.getElementById("last-results-controls");
  if (lastResultsControls) lastResultsControls.style.display = "none";
};

/**
 * Sets up clear results button
 */
const setupClearResults = (clearResultsBtn, isbnInput, bulkProgress) => {
  if (!clearResultsBtn) return;

  clearResultsBtn.addEventListener("click", () => {
    hideLastResultsControls();
    isbnInput.value = "";
    bulkProgress.classList.add("hidden");
  });
};

// Listen for clear results message from modal
chrome.runtime.onMessage.addListener((message) => {
  if (message.command === 'clearPriceResults') {
    hideLastResultsControls();
    const isbnInput = document.getElementById("isbn-input");
    if (isbnInput) isbnInput.value = "";
  }
});

/**
 * Sets up all book pricing listeners
 */
export const setupBookPricingListeners = () => {
  const bulkPriceCheckBtn = document.getElementById("bulkPriceCheck");
  const bulkPriceContainer = document.getElementById("bulk-price-container");
  const isbnInput = document.getElementById("isbn-input");
  const startBulkCheckBtn = document.getElementById("startBulkCheck");
  const cancelBulkCheckBtn = document.getElementById("cancelBulkCheck");
  const bulkProgress = document.getElementById("bulk-progress");
  const copyResultsBtn = document.getElementById("copyResults");
  const clearResultsBtn = document.getElementById("clearResults");
  const showLastResultsBtn = document.getElementById("showLastResults");

  setupBulkPriceToggle(bulkPriceCheckBtn, bulkPriceContainer, isbnInput);
  setupCancelBulkCheck(cancelBulkCheckBtn, bulkPriceContainer, bulkProgress);
  setupStartBulkCheck(startBulkCheckBtn, isbnInput, bulkProgress);
  setupCopyResults(copyResultsBtn);
  setupClearResults(clearResultsBtn, isbnInput, bulkProgress);
  setupShowLastResults(showLastResultsBtn);
};
