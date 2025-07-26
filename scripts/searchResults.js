function searchResults() {
  // Checks URL to determine if the search is an ISBN search (More accurate and you don't need to look so close)
  function isISBNSearch() {
    const url = window.location.href;
    return url.includes("&query=97");
  }

  // Either highlights the search field div red if it's an ISBN search, or the default if not
  function updateSearchResultsDiv() {
    const searchResultsDiv = document.getElementById("staffcat-search-form");
    isISBNSearch()
      ? (searchResultsDiv.style.backgroundColor = "#ffeaea")
      : (searchResultsDiv.style.backgroundColor = "#f7f7f7");
  }

  updateSearchResultsDiv();

  let copyLocations = document.querySelectorAll("td.copy-location");

  if (copyLocations.length === 0) {
    let tries = 0;
    const interval = setInterval(() => {
      copyLocations = document.querySelectorAll("td.copy-location");
      if (copyLocations.length > 0 || tries >= 50) {
        clearInterval(interval);
        if (copyLocations.length > 0) {
          highlightReadyReads(copyLocations);
          highlightNoHoldsLibraries();
        }
      }
      tries++;
    }, 100);
  }
}

// Emphasizes shelving locations whose available items are not holdable
function highlightReadyReads(copyLocations) {
  copyLocations.forEach((location) => {
    if (location.textContent === "Ready Reads") {
      location.parentElement.style.backgroundColor = "#ffcccb";
      location.parentElement.style.fontWeight = "lighter";
    }
  });
}

// Emphasizes owning libraries whose available items are not holdable
function highlightNoHoldsLibraries() {
  let libraryLocations = document.querySelectorAll("th.shelving-library");
  const noHoldsLibraries = ["OU", "JD", "CR", "GR", "SO", "SV"];
  libraryLocations.forEach((location) => {
    if (noHoldsLibraries.includes(location.textContent)) {
      location.style.fontWeight = "lighter";
      location.parentElement.style.backgroundColor = "#ffcccb";
    }
  });
}

searchResults();
