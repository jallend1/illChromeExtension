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
  // TODO: Why would I have this. If there are no copy locations, what am I even doing with my life.
  // else {
  //   highlightReadyReads(copyLocations);
  //   highlightNoHoldsLibraries();
  // }
}

// Emphasizes shelving locations whose available items are not holdable
function highlightReadyReads(copyLocations) {
  copyLocations.forEach((location) => {
    if (location.textContent === "Ready Reads") {
      location.parentElement.style.backgroundColor = "#ffcccb";
      location.parentElement.style.textDecoration = "line-through";
      location.parentElement.style.fontWeight = "lighter";
    }
  });
}

// Emphasizes owning libraries whose available items are not holdable
function highlightNoHoldsLibraries() {
  let libraryLocations = document.querySelectorAll("th.shelving-library");
  const noHoldsLibraries = ["OU", "JD", "CR", "SO"];
  libraryLocations.forEach((location) => {
    if (noHoldsLibraries.includes(location.textContent)) {
      location.style.fontWeight = "lighter";
      location.parentElement.style.backgroundColor = "#ffcccb";
      location.parentElement.style.textDecoration = "line-through";
    }
  });
}

searchResults();
