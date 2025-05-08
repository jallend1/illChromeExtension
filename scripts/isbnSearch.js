// ********************************************
// *            Searching Script              *
// ********************************************
// When executed from a lending request in WorldShare, this script will
// extract the ISBN, title and author fields from the page and build
// a search URL for Evergreen. It will then send a message to the background
// script to open the search URL in a new tab.
//
// It removes hyphens from ISBNs, colons from titles, and takes the first
// author listed. It also compares against the previous search to catch potential
// workflow errors.

async function isbnSearch() {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );

  const buildSearchURL = (query) => {
    const encodedQuery = encodeURIComponent(query); // Encodes the query for URL to deal with those troublesome ampersands
    return `search?org=1&limit=10&query=${encodedQuery}%20&fieldClass=keyword&joinOp=&matchOp=contains&dateOp=is&ridx=122`;
  };

  const extractFields = (selector) => {
    const latestField = document.querySelector(
      `div:not(.yui3-default-hidden) span${selector}:not(div.yui3-default-hidden span)`
    );
    return latestField ? latestField.textContent : null;
  };

  const getSearchQuery = (isbn, title, author) =>
    isbn ? isbn : title && author ? `${title} ${author}` : title || null;

  let isbn = extractFields(".yui-field-isbn")?.split(" ")[0].replace(/-/g, ""); // Takes the first ISBN and removes any hyphens
  let title = extractFields(".yui-field-title")?.replace(/:/g, ""); // Removes any colons from the title
  let author = extractFields(".yui-field-author")?.split(";")[0]; // Takes the first author
  let searchQuery = getSearchQuery(isbn, title, author); // Function to get the search query based on the fields

  if (searchQuery) {
    const previousIsbnSearch = sessionStorage.getItem("isbnSearch"); // Checks previous isbnSearch to prevent duplicate searches
    if (previousIsbnSearch === searchQuery) {
      statusModal(
        "Possible Duplicate Search!",
        "This matches the last search we did. Double check the item is what you're looking for on the next page. If not, try refreshing WorldShare!",
        "#e85e6a",
        chrome.runtime.getURL("images/kawaii-book-sad.png")
      );
    }

    sessionStorage.setItem("isbnSearch", searchQuery);
    const urlSuffix = buildSearchURL(searchQuery); // Builds the search URL
    chrome.runtime.sendMessage({
      action: "isbnSearch",
      url: urlSuffix,
    });
  } else {
    // If no search parameters are found, show error modal
    statusModal(
      "No Search Parameters Found!",
      "We couldn't find any ISBN or Title/Author fields on this page. Please check the fields and try again.",
      "#e85e6a",
      chrome.runtime.getURL("images/kawaii-book-sad.png")
    );
  }
}

isbnSearch();
