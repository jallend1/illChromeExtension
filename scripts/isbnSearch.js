function isbnSearch() {
  const extractFields = (selector) => {
    const fields = document.querySelectorAll(selector);
    // Title field has an extra node for some reason
    const subtractor = selector.includes("title") ? 2 : 1;
    const latestField = fields[fields.length - subtractor];
    if (!latestField) return null;
    return latestField.textContent;
  };

  let isbn = extractFields(".yui-field-isbn");
  let title = extractFields(".yui-field-title");
  let author = extractFields(".yui-field-author");

  let searchQuery = null;
  if (isbn) {
    // Takes only the first ISBN if multiple are present
    searchQuery = isbn.split(" ")[0];
    // Removes any "-" from the ISBN
    searchQuery = searchQuery.replace(/-/g, "");
  } else if (title && author) {
    let firstAuthor = author.split(";")[0];
    searchQuery = `${title} ${firstAuthor}`;
  } else if (title) {
    searchQuery = title;
  } else {
    alert("No ISBN or Title/Author found. Please check the record.");
    return;
  }

  if (searchQuery) {
    // Keyword search doesn't like colons
    searchQuery = searchQuery.replace(":", "");

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
