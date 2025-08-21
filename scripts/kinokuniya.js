(async () => {
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

  // If we're on a product page, we could extract info here later
  else if (
    window.location.href.includes("/products/") &&
    !window.location.href.includes("?")
  ) {
    console.log("On Kinokuniya product page");

    // Future enhancement: Extract price and ISBN here
    // For now, just log that we're on a product page
    const priceElement = document.querySelector(".price span");
    const price = priceElement
      ? priceElement.textContent.trim()
      : "Price not found";
    console.log(`Product price: ${price}`);
  }
})();
