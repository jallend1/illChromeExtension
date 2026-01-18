// TODO: Import minimodal to alert when search is not ISBN based

async function searchResults() {
  const { keyboardCowboy, createMiniModal } = await import(
    chrome.runtime.getURL("modules/modals.js")
  );

  // Checks URL to determine if the search is an ISBN search (More accurate and you don't need to look so close)
  function isISBNSearch() {
    const url = window.location.href;
    return url.includes("&query=97");
  }

  function keywordQueryIncludesColon() {
    const url = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("query") || "";
    const isKeywordSearch = urlParams.get("fieldClass") === "keyword";
    return query.includes(":") && isKeywordSearch;
  }

  // Either highlights the search field div red if it's an ISBN search, or the default if not
  function updateSearchResultsDiv() {
    const searchResultsDiv = document.getElementById("staffcat-search-form");
    if (!searchResultsDiv) return;
    if (isISBNSearch()) {
      searchResultsDiv.style.backgroundColor = "#f7f7f7";
      return;
    } else {
      searchResultsDiv.style.backgroundColor = "#ffeaea";
      createMiniModal("You're not searching by ISBN, so look alive!", true);
    }

    if (keywordQueryIncludesColon()) {
      keyboardCowboy(
        "Evergreen struggles with colons in keyword searches. It works well under a title search, however!",
        "Did you know?",
      );
    }
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
