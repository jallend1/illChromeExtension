function searchResults() {
  // TODO: Change the div background color if the search is for a keyword instead of an ISBN
  // Kind of a placeholder function until I can examine the URL more specifically
  // Might need to use regex to determine the search type more meaningfully
  function getSearchType() {
    const url = window.location.href;
    if (url.includes("search?query=")) {
      return "keyword"; // Keyword search
    }
    if (url.includes("search?isbn=")) {
      return "isbn"; // ISBN search
    }

    return "unknown"; // Unknown search type
  }

  const searchType = getSearchType(); // Assume this function determines the search type
  if (searchType === "keyword") {
    document.querySelector("div.search-results").style.backgroundColor =
      "#f0f8ff";
  }

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
