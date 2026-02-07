(async () => {
  const { waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  // Wait for .patron-search-grid to exist in the DOM
  const patronSearchGrid = await waitForElementWithInterval(
    ".patron-search-grid",
  );

  if (!patronSearchGrid) {
    console.error("Patron search grid not found");
    return;
  }

  console.log("Patron search grid found, setting up observer");

  let previousLength = 0;
  let stabilityTimer = null;
  let shortcutsRegistered = false;

  // Function to extract and log number cells
  const processNumberCells = () => {
    const numberCells = document.querySelectorAll(
      ".eg-grid-body .eg-grid-number-cell",
    );
    console.log("Number cells found:", numberCells.length);

    const currentLength = numberCells.length;

    // If length changed, reset the stability timer
    if (currentLength !== previousLength) {
      console.log(`Length changed from ${previousLength} to ${currentLength}`);
      previousLength = currentLength;

      if (stabilityTimer) {
        clearTimeout(stabilityTimer);
      }

      // Set a new timer for 3 seconds
      stabilityTimer = setTimeout(() => {
        console.log("Length stable for 3 seconds, registering shortcuts");
        registerKeyboardShortcuts(numberCells);
      }, 3000);
    }
  };

  // Function to register keyboard shortcuts
  const registerKeyboardShortcuts = (numberCells) => {
    // Use window flag to prevent multiple registrations across script injections
    if (window.patronSearchShortcutsRegistered) {
      console.log("Shortcuts already registered globally");
      return;
    }

    // Get the first 9 cells
    const cellsToMap = Array.from(numberCells).slice(0, 9);

    console.log("Registering shortcuts for cells:", cellsToMap);

    // Create a map of key number to row value
    const shortcutMap = {};
    cellsToMap.forEach((cell) => {
      const value = cell.textContent.trim();
      shortcutMap[value] = value;
    });

    console.log("Shortcut map:", shortcutMap);

    // Add keyboard event listener
    document.addEventListener("keydown", (event) => {
      // Check for Ctrl+Shift+[1-9]
      if (event.ctrlKey && event.shiftKey) {
        // Extract digit from code like "Digit1" -> "1"
        const match = event.code.match(/^Digit(\d)$/);
        if (match) {
          const digit = match[1];
          if (shortcutMap[digit]) {
            event.preventDefault();
            console.log(`Row ${digit} has been triggered`);
          }
        }
      }
    });

    window.patronSearchShortcutsRegistered = true;
    shortcutsRegistered = true;
    console.log("Keyboard shortcuts registered successfully");
  };

  // Once it exists, monitor it for changes
  const observer = new MutationObserver(() => {
    // When it changes, extract the number cells and log them to the console
    processNumberCells();
  });

  // Start observing the patron search grid for changes
  observer.observe(patronSearchGrid, {
    childList: true, // Watch for added/removed child nodes
    subtree: true, // Watch all descendants, not just direct children
  });

  // Process the initial state
  processNumberCells();
})();
