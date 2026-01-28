/**
 * Book pricing functionality for Kinokuniya searches
 */

let isProcessing = false;
let currentResults = [];

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
 * Creates a result display element
 */
const createResultElement = (isbn, isbnForResults, result) => {
  const resultDiv = document.createElement("div");
  resultDiv.style.cssText =
    "padding: 5px; margin: 5px 0; border: 1px solid #ccc; font-size: 12px;";

  if (result.found) {
    const isbnDisplay = isbnForResults ? `<br/>ISBN: ${isbnForResults}` : "";
    resultDiv.innerHTML = `
      <strong>Search: ${isbn}</strong>${isbnDisplay}<br/>
      Price: ${result.price}<br/>
      <a href="${result.url}" target="_blank">View Product</a>
    `;
    resultDiv.style.backgroundColor = "#d4edda";
  } else {
    resultDiv.innerHTML = `<strong>Search: ${isbn}</strong><br/>Not found${
      result.error ? ": " + result.error : ""
    }`;
    resultDiv.style.backgroundColor = "#f8d7da";
  }

  return resultDiv;
};

/**
 * Processes a single ISBN search
 */
const processIsbn = async (isbn, priceOutput) => {
  document.getElementById("current-isbn").textContent = isbn;
  document.getElementById("status-text").textContent = "Searching...";

  try {
    const result = await waitForSearchResult(isbn);

    // Determine which ISBN to use for the results
    // If original search term starts with "97", it's already an ISBN
    // Otherwise, use the extracted ISBN from the page
    let isbnForResults = "";
    if (isbn.startsWith("97")) {
      isbnForResults = isbn;
    } else if (result.extractedIsbn) {
      isbnForResults = result.extractedIsbn;
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

    // Display result
    const resultDiv = createResultElement(isbn, isbnForResults, result);
    priceOutput.appendChild(resultDiv);

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
  bulkProgress,
  priceResults,
  priceOutput
) => {
  if (!startBulkCheckBtn) return;

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
      document.getElementById("progress-text").textContent = `${i + 1}/${isbns.length}`;

      await processIsbn(isbns[i], priceOutput);

      // Wait before next search (respect rate limits)
      if (i < isbns.length - 1 && isProcessing) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    document.getElementById("status-text").textContent = "Complete!";
    startBulkCheckBtn.disabled = false;
    isProcessing = false;
  });
};

/**
 * Sets up copy results button
 */
const setupCopyResults = (copyResultsBtn) => {
  if (!copyResultsBtn) return;

  copyResultsBtn.addEventListener("click", () => {
    // Format results as tab-separated for Excel
    // Columns: ISBN-13, Search Term, Price, Source ("Kinokuniya" if found), Blank, Link
    const lines = currentResults.map((r) => {
      // Only include ISBN if it starts with 97 (valid ISBN-13)
      const isbn13 = r.isbn && r.isbn.startsWith("97") ? r.isbn : "";
      // Source column: "Kinokuniya" if found, blank otherwise
      const source = r.found ? "Kinokuniya" : "";
      // Blank column
      const blank = "";
      // Format URL as Excel HYPERLINK formula if found
      const link = r.found && r.url ? `=HYPERLINK("${r.url}","Link")` : "";
      return `${isbn13}\t${r.searchTerm}\t${r.price}\t${source}\t${blank}\t${link}`;
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
};

/**
 * Sets up clear results button
 */
const setupClearResults = (clearResultsBtn, priceOutput, priceResults, isbnInput) => {
  if (!clearResultsBtn) return;

  clearResultsBtn.addEventListener("click", () => {
    currentResults = [];
    priceOutput.innerHTML = "";
    priceResults.classList.add("hidden");
    isbnInput.value = "";
  });
};

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
  const priceResults = document.getElementById("price-results");
  const priceOutput = document.getElementById("price-output");
  const copyResultsBtn = document.getElementById("copyResults");
  const clearResultsBtn = document.getElementById("clearResults");

  setupBulkPriceToggle(bulkPriceCheckBtn, bulkPriceContainer, isbnInput);
  setupCancelBulkCheck(cancelBulkCheckBtn, bulkPriceContainer, bulkProgress);
  setupStartBulkCheck(startBulkCheckBtn, isbnInput, bulkProgress, priceResults, priceOutput);
  setupCopyResults(copyResultsBtn);
  setupClearResults(clearResultsBtn, priceOutput, priceResults, isbnInput);
};
