(async () => {
  // Prevent double execution
  if (window.kinokuniyaProductPageExecuted) {
    console.log("kinokuniyaProductPage.js already executed, skipping");
    return;
  }
  window.kinokuniyaProductPageExecuted = true;

  console.log("kinokuniyaProductPage.js loaded on:", window.location.href);

  // Wait for page to fully load
  console.log("kinokuniyaProductPage.js - Waiting 2 seconds for page to load...");
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log("kinokuniyaProductPage.js - Starting price extraction...");

  // Extract price - try multiple approaches
  let price = "Price not found";

  // Method 1: Look for "Online Price" text and extract price before it
  const bodyText = document.body.textContent;
  const onlinePriceMatch = bodyText.match(/\$[\d,.]+\s+Online Price/i);
  if (onlinePriceMatch) {
    price = onlinePriceMatch[0].replace(/\s+Online Price/i, "").trim();
    console.log(`Found price using text match: ${price}`);
  }

  // Method 2: Try common price selectors if Method 1 failed
  if (price === "Price not found") {
    const priceSelectors = [
      ".product-price .price-value",
      ".product-price span",
      ".price span",
      "[data-price]",
      ".online-price",
      ".price",
      "[itemprop='price']",
    ];

    for (const selector of priceSelectors) {
      const priceElement = document.querySelector(selector);
      if (priceElement) {
        price = priceElement.textContent.trim();
        console.log(`Found price using selector ${selector}: ${price}`);
        break;
      }
    }
  }

  console.log(`Final extracted price: ${price}`);

  // Extract ISBN from the page - try multiple methods
  let isbn = "";

  // Method 1: Look in the bookData table for ISBN row
  const bookDataTable = document.querySelector("table.bookData");
  if (bookDataTable) {
    console.log("kinokuniyaProductPage.js - Found bookData table, searching for ISBN");
    const rows = bookDataTable.querySelectorAll("tr");
    for (const row of rows) {
      const th = row.querySelector("th");
      if (th && th.textContent.trim() === "ISBN") {
        const td = row.querySelector("td");
        if (td) {
          isbn = td.textContent.trim();
          console.log(`kinokuniyaProductPage.js - Found ISBN in bookData table: ${isbn}`);
          break;
        }
      }
    }
  }

  // Method 2: Try other common ISBN selectors
  if (!isbn) {
    const isbnElement = document.querySelector(
      '[data-isbn], [itemprop="isbn"], .isbn'
    );
    if (isbnElement) {
      isbn = isbnElement.textContent.trim();
      console.log(`kinokuniyaProductPage.js - Found ISBN via selector: ${isbn}`);
    }
  }

  // Method 3: If we can't find ISBN on page, try to extract from URL params
  if (!isbn) {
    const urlParams = new URLSearchParams(window.location.search);
    isbn = urlParams.get("isbn") || "";
    if (isbn) {
      console.log(`kinokuniyaProductPage.js - Found ISBN in URL params: ${isbn}`);
    }
  }

  console.log(`kinokuniyaProductPage.js - Final extracted ISBN: ${isbn}`);

  console.log(`kinokuniyaProductPage.js - Product price: ${price}, ISBN: ${isbn}`);

  // Send result back to extension
  const message = {
    command: "kinokuniyaResult",
    found: true,
    url: window.location.href,
    price: price,
    isbn: isbn,
  };
  console.log("kinokuniyaProductPage.js - Sending message to background:", message);

  chrome.runtime.sendMessage(message, () => {
    if (chrome.runtime.lastError) {
      console.error(
        "kinokuniyaProductPage.js - Error sending message:",
        chrome.runtime.lastError
      );
    } else {
      console.log("kinokuniyaProductPage.js - Message sent successfully");
    }
  });
})();
