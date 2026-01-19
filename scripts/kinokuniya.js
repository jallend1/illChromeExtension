(async () => {
  // Prevent double execution
  if (window.kinokuniyaScriptExecuted) {
    console.log("kinokuniya.js already executed, skipping");
    return;
  }
  window.kinokuniyaScriptExecuted = true;

  console.log("Kinokuniya helper script loaded on:", window.location.href);

  // Wait for page to load
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Check if we're on a search results page
  if (
    window.location.href.includes("/products?") &&
    window.location.href.includes("is_searching=true")
  ) {
    console.log("On Kinokuniya search results page");

    // Wait a bit more for search results to load
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check for no results first
    const noResults = document.querySelector(".no-results, .no-products");
    if (noResults) {
      console.log("No search results found");
      return;
    }

    // Look for product links - try multiple selectors based on your Python script
    const productLinks =
      document.querySelectorAll(".inner_box a") ||
      document.querySelectorAll(".productTileBox a") ||
      document.querySelectorAll("[data-product-id] a") ||
      document.querySelectorAll(".product-tile a");

    console.log(`Found ${productLinks.length} product links`);

    // If there's exactly one result, automatically click it
    if (productLinks.length === 1) {
      const productLink = productLinks[0];
      const productUrl = productLink.href;

      console.log(
        `Only one result found, automatically navigating to: ${productUrl}`
      );

      // Add a small visual indicator that we're auto-navigating
      const indicator = document.createElement("div");
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #4CAF50;
        color: white;
        padding: 10px;
        border-radius: 5px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
      `;
      indicator.textContent = "Auto-navigating to product page...";
      document.body.appendChild(indicator);

      // Navigate to the product page after a short delay
      setTimeout(() => {
        window.location.href = productUrl;
      }, 1000);
    } else if (productLinks.length > 1) {
      console.log(
        `Multiple results found (${productLinks.length}), not auto-navigating`
      );
    } else {
      console.log("No product links found on search results page");
    }
  }

  // If we're on a product page, extract info and send to sidepanel
  else if (
    (window.location.href.includes("/products/") ||
      window.location.href.includes("/bw/")) &&
    !window.location.href.includes("?")
  ) {
    console.log(
      "kinokuniya.js - On Kinokuniya product page:",
      window.location.href
    );

    // Wait for page to fully load
    console.log("kinokuniya.js - Waiting 2 seconds for page to load...");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("kinokuniya.js - Starting price extraction...");

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
      console.log("kinokuniya.js - Found bookData table, searching for ISBN");
      const rows = bookDataTable.querySelectorAll("tr");
      for (const row of rows) {
        const th = row.querySelector("th");
        if (th && th.textContent.trim() === "ISBN") {
          const td = row.querySelector("td");
          if (td) {
            isbn = td.textContent.trim();
            console.log(`kinokuniya.js - Found ISBN in bookData table: ${isbn}`);
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
        console.log(`kinokuniya.js - Found ISBN via selector: ${isbn}`);
      }
    }

    // Method 3: If we can't find ISBN on page, try to extract from URL params
    if (!isbn) {
      const urlParams = new URLSearchParams(window.location.search);
      isbn = urlParams.get("isbn") || "";
      if (isbn) {
        console.log(`kinokuniya.js - Found ISBN in URL params: ${isbn}`);
      }
    }

    console.log(`kinokuniya.js - Final extracted ISBN: ${isbn}`);

    console.log(`kinokuniya.js - Product price: ${price}, ISBN: ${isbn}`);

    // Send result back to extension
    const message = {
      command: "kinokuniyaResult",
      found: true,
      url: window.location.href,
      price: price,
      isbn: isbn,
    };
    console.log("kinokuniya.js - Sending message to background:", message);

    chrome.runtime.sendMessage(message, () => {
      if (chrome.runtime.lastError) {
        console.error(
          "kinokuniya.js - Error sending message:",
          chrome.runtime.lastError
        );
      } else {
        console.log("kinokuniya.js - Message sent successfully");
      }
    });
  }
})();
