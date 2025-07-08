(async () => {
  const virtualShelfContainer = document.getElementById(
    "virtual-shelf-container"
  );

  // Extract virtualBookShelf from local storage
  const virtualBookShelf = await new Promise((resolve) => {
    chrome.storage.local.get("virtualBookShelf", (data) => {
      resolve(data.virtualBookShelf || []);
    });
  });

  console.log("Virtual Book Shelf:", virtualBookShelf);

  // Sorts unique states alphabetically
  // TODO: Is this better than sorting books by state beforehand?
  const uniqueStates = [
    ...new Set(virtualBookShelf.map((book) => book.borrowingAddress.region)),
  ].sort((a, b) => a.localeCompare(b));

  // Create state containers in alphabetical order
  uniqueStates.forEach((libraryState) => {
    const stateElement = document.createElement("div");
    stateElement.className = "state-container";
    stateElement.id = libraryState.replace(/\s+/g, "-").toLowerCase();

    const headingState = document.createElement("h2");
    headingState.className = "state";
    headingState.id = libraryState.replace(/\s+/g, "-").toLowerCase();
    headingState.textContent = libraryState;

    stateElement.appendChild(headingState);
    virtualShelfContainer.appendChild(stateElement);
  });

  // Adds the books to the state containers
  virtualBookShelf.forEach((book) => {
    // Assign values to variables
    const libraryName =
      book.borrowingAddress.attention + " - " + book.borrowingAddress.line1;
    const dueDate = new Date(book.dueDate);
    const libraryState = book.borrowingAddress.region;
    const title = book.title;

    // Create individual spans for due date and title
    const dueDateSpan = document.createElement("span");
    dueDateSpan.className = "due-date-span";
    dueDateSpan.textContent = `${dueDate.toLocaleDateString()} - `;

    const titleSpan = document.createElement("span");
    titleSpan.className = "title-span";
    titleSpan.textContent = title;

    // Create the due date element
    const dueDateElement = document.createElement("p");
    dueDateElement.className = "due-date";
    dueDateElement.appendChild(dueDateSpan);
    dueDateElement.appendChild(titleSpan);

    // Get the state container (now guaranteed to exist)
    const stateContainer = document.getElementById(
      libraryState.replace(/\s+/g, "-").toLowerCase()
    );

    // Check if a library with the same name already exists in this state
    const existingLibraryElements = stateContainer.querySelectorAll(
      ".book h3.library-name"
    );
    let existingLibraryDiv = null;

    for (let libraryElement of existingLibraryElements) {
      if (libraryElement.textContent === libraryName) {
        existingLibraryDiv = libraryElement.parentElement; // Get the parent .book div
        break;
      }
    }

    if (existingLibraryDiv) {
      // Library already exists, just append the due date element
      existingLibraryDiv.appendChild(dueDateElement);
    } else {
      // Create new book element for this library
      const bookElement = document.createElement("div");
      bookElement.className = "book";

      const libraryNameElement = document.createElement("h3");
      libraryNameElement.className = "library-name";
      libraryNameElement.textContent = `${libraryName}`;

      bookElement.appendChild(libraryNameElement);
      bookElement.appendChild(dueDateElement);
      stateContainer.appendChild(bookElement);
    }
  });
})();
