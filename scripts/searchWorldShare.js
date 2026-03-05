(async () => {
  const { waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  const sidebar = document.querySelector("#nd-sidebar");
  if (!sidebar) {
    console.error("searchWorldShare: #nd-sidebar not found");
    return;
  }
  const label = Array.from(
    sidebar.querySelectorAll(".yui3-accordion-panel-label")
  ).find((el) => el.textContent.trim() === "Discover Items");
  if (!label) {
    console.error('searchWorldShare: "Discover Items" label not found');
    return;
  }
  label.click();

  const { worldShareSearchTerm: searchTerm } = await new Promise((resolve) =>
    chrome.storage.local.get("worldShareSearchTerm", resolve)
  );
  if (!searchTerm) {
    console.error("searchWorldShare: No search term found in storage");
    return;
  }

  const searchInput = await waitForElementWithInterval(() =>
    document.querySelector('[name="searchTerm"]')
  );
  searchInput.textContent = searchTerm;

  const searchButton = Array.from(document.querySelectorAll("button")).find(
    (btn) => btn.textContent.trim() === "Search"
  );
  if (!searchButton) {
    console.error('searchWorldShare: "Search" button not found');
    return;
  }
  searchButton.click();
})();
