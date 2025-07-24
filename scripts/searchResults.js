function searchResults() {
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
