(async () => {
  // Prevent double execution
  if (window.kinokuniyaSearchResultsExecuted) {
    console.log("kinokuniyaSearchResults.js already executed, skipping");
    return;
  }
  window.kinokuniyaSearchResultsExecuted = true;

  console.log("kinokuniyaSearchResults.js loaded on:", window.location.href);

  // Wait for page to load
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const results = document.querySelectorAll(".clearfix > .box");
  console.log(`Found ${results.length} results`);

  if (results.length === 1) {
    console.log("One result found - navigating to product page");
    // Select child of results[0] element that has a class of "inner_box"
    const innerBox = results[0].querySelector(".inner_box > a");
    if (innerBox) {
      console.log("Clicking inner box to navigate to product page");
      innerBox.click();
      // Don't send any message here - wait for the product page to load
      // The kinokuniyaProductPage.js script will handle sending the result
    } else {
      console.error("Could not find inner box link");
      chrome.runtime.sendMessage({
        command: "kinokuniyaResult",
        found: false,
        url: window.location.href,
        price: "",
        isbn: "",
        error: "Could not navigate to product",
      });
    }
  } else if (results.length === 0) {
    console.log("No results found - sending not found message");
    chrome.runtime.sendMessage({
      command: "kinokuniyaResult",
      found: false,
      url: window.location.href,
      price: "",
      isbn: "",
      error: "No results found",
    });
  } else {
    console.log(`Multiple results found (${results.length}) - user needs to select`);
    chrome.runtime.sendMessage({
      command: "kinokuniyaResult",
      found: false,
      url: window.location.href,
      price: "",
      isbn: "",
      error: `Multiple results found (${results.length})`,
    });
  }
})();
