function isbnSearch() {
  const extractFields = (selector) => {
    const fields = document.querySelectorAll(selector);
    const subtractor = selector.includes("title") ? 2 : 1; // Title field has an extra node for some reason
    const latestField = fields[fields.length - subtractor];
    if (!latestField) return null;
    return latestField.textContent;
  };

  const getSearchQuery = (isbn, title, author) => {
    if (isbn) {
      return isbn;
    } else if (title && author) {
      return `${title} ${author}`;
    } else if (title) {
      return title;
    } else {
      return null;
    }
  };

  let isbn = extractFields(".yui-field-isbn")?.split(" ")[0].replace(/-/g, ""); // Takes the first ISBN and removes any hyphens
  let title = extractFields(".yui-field-title")?.replace(/:/g, ""); // Removes any colons from the title
  let author = extractFields(".yui-field-author")?.split(";")[0]; // Takes the first author

  let searchQuery = getSearchQuery(isbn, title, author); // Function to get the search query based on the fields

  if (searchQuery) {
    // Checks previous isbnSearch to prevent duplicate searches
    const previousIsbnSearch = sessionStorage.getItem("isbnSearch");

    // TODO: Maybe make this a bit more expansive? Error modal? Automatic page refresh?
    if (previousIsbnSearch === searchQuery) {
      alert(
        "This matches the last search we did. Double check the item is what you're looking for on the next page. If not, try refreshing WorldShare!"
      );
    }
    sessionStorage.setItem("isbnSearch", searchQuery);

    const urlSuffix = `search?org=1&limit=10&query=${searchQuery}%20&fieldClass=keyword&joinOp=&matchOp=contains&dateOp=is&ridx=122`;
    chrome.runtime.sendMessage({ action: "isbnSearch", url: urlSuffix });
  } else {
    alert("No search eligible search parameters found on this page.");
  }
}

isbnSearch();
