(async () => {
  // Prevent double execution
  if (window.kingStoneSearchResultsExecuted) {
    console.log("kingStoneSearchResults.js already executed, skipping");
    return;
  }
  window.kingStoneSearchResultsExecuted = true;

  console.log("kingStoneSearchResults.js loaded on:", window.location.href);

  // Poll for content to appear (up to 10 seconds)
  const waitForContent = async (maxWait = 10000) => {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      // Check if page has price or ISBN text anywhere
      const bodyText = document.body.textContent;
      if (/價格[：:]\s*[\d,.]+/.test(bodyText) || /ISBN[：:]\s*[\d-]+/.test(bodyText)) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return false;
  };

  const hasContent = await waitForContent();

  if (!hasContent) {
    console.log("KingStone: No price/ISBN content found after waiting");
    chrome.runtime.sendMessage({
      command: "kingStoneResult",
      found: false,
      url: window.location.href,
      price: "",
      isbn: "",
      error: "No results found",
    });
    return;
  }

  // Extract data - try specific selectors first, fall back to full page text
  const bodyText = document.body.textContent;
  console.log("KingStone: Page text length:", bodyText.length);

  // Extract price from "價格:XX.XX" anywhere on the page
  let price = "";
  const priceMatch = bodyText.match(/價格[：:]\s*([\d,.]+)/);
  if (priceMatch) {
    price = "$" + priceMatch[1].trim();
    console.log(`KingStone: Found price: ${price}`);
  }

  // Extract ISBN from "ISBN:XXXXXXXXXXXXX" anywhere on the page
  let isbn = "";
  const isbnMatch = bodyText.match(/ISBN[：:]\s*([\d-]+)/);
  if (isbnMatch) {
    isbn = isbnMatch[1].trim();
    console.log(`KingStone: Found ISBN: ${isbn}`);
  }

  // Extract product URL - try multiple selector strategies
  let url = window.location.href;

  // Strategy 1: .book-title a
  let bookLink = document.querySelector(".book-title a");
  // Strategy 2: any link inside .panel-body
  if (!bookLink) bookLink = document.querySelector(".panel-body a[href*='/books/']");
  if (!bookLink) bookLink = document.querySelector(".panel-body a[href*='/Books/']");
  // Strategy 3: any link that looks like a book detail page
  if (!bookLink) bookLink = document.querySelector("a[href*='/books/Details/']");
  if (!bookLink) bookLink = document.querySelector("a[href*='/Books/Details/']");
  // Strategy 4: any link containing the book title text near the ISBN
  if (!bookLink) bookLink = document.querySelector("a[href*='/products/']");

  if (bookLink) {
    url = bookLink.href;
    console.log(`KingStone: Found product URL: ${url}`);
  } else {
    console.log("KingStone: No product link found, using current page URL");
  }

  const found = !!(price || isbn);
  console.log(`KingStone: Result - found: ${found}, price: ${price}, isbn: ${isbn}, url: ${url}`);

  chrome.runtime.sendMessage(
    {
      command: "kingStoneResult",
      found: found,
      url: url,
      price: price,
      isbn: isbn,
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          "kingStoneSearchResults.js - Error sending message:",
          chrome.runtime.lastError,
        );
      } else {
        console.log("kingStoneSearchResults.js - Message sent successfully");
      }
    },
  );
})();
