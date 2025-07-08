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

  // Group books by state and library, then sort
  const booksByState = {};

  virtualBookShelf.forEach((book) => {
    const libraryState = book.borrowingAddress.region;
    const libraryName =
      book.borrowingAddress.attention + " - " + book.borrowingAddress.line1;

    if (!booksByState[libraryState]) {
      booksByState[libraryState] = {};
    }

    if (!booksByState[libraryState][libraryName]) {
      booksByState[libraryState][libraryName] = [];
    }

    booksByState[libraryState][libraryName].push(book);
  });

  // Remove book from storage and refresh display
  const removeBookFromStorage = async (bookToRemove) => {
    const updatedShelf = virtualBookShelf.filter(
      (book) =>
        !(
          book.title === bookToRemove.title &&
          book.borrowingAddress.attention ===
            bookToRemove.borrowingAddress.attention &&
          book.borrowingAddress.line1 === bookToRemove.borrowingAddress.line1 &&
          book.dueDate === bookToRemove.dueDate
        )
    );

    await new Promise((resolve) => {
      chrome.storage.local.set({ virtualBookShelf: updatedShelf }, resolve);
    });

    // Refresh the page to show updated list
    location.reload();
  };

  // Sort states alphabetically
  const sortedStates = Object.keys(booksByState).sort((a, b) =>
    a.localeCompare(b)
  );

  // Create state containers and populate with sorted libraries
  sortedStates.forEach((libraryState) => {
    // Create state container
    const stateElement = document.createElement("div");
    stateElement.className = "state-container";
    stateElement.id = libraryState.replace(/\s+/g, "-").toLowerCase();

    const headingState = document.createElement("h2");
    headingState.className = "state";
    headingState.id = libraryState.replace(/\s+/g, "-").toLowerCase();
    headingState.textContent = libraryState;

    stateElement.appendChild(headingState);

    // Sort libraries within this state alphabetically
    const sortedLibraries = Object.keys(booksByState[libraryState]).sort(
      (a, b) => a.localeCompare(b)
    );

    // Create library elements in sorted order
    sortedLibraries.forEach((libraryName) => {
      const books = booksByState[libraryState][libraryName];

      // Create book element for this library
      const bookElement = document.createElement("div");
      bookElement.className = "book";

      const libraryNameElement = document.createElement("h3");
      libraryNameElement.className = "library-name";
      libraryNameElement.textContent = libraryName;
      bookElement.appendChild(libraryNameElement);

      // Add all books from this library
      books.forEach((book) => {
        const dueDate = new Date(book.dueDate);
        const title = book.title;

        // Get current date and calculate date differences for styling
        const today = new Date();
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(today.getDate() + 14);

        // Create individual spans for due date and title
        const dueDateSpan = document.createElement("span");
        dueDateSpan.className = "due-date-span";
        dueDateSpan.textContent = `${dueDate.toLocaleDateString()} - `;

        const titleSpan = document.createElement("span");
        titleSpan.className = "title-span";
        titleSpan.textContent = title;

        // Create remove button
        const removeButton = document.createElement("button");
        removeButton.classList.add("remove-button");
        removeButton.textContent = "Remove";

        // Add click handler to remove button
        removeButton.addEventListener("click", () => {
          if (confirm(`Are you sure you want to remove "${title}"?`)) {
            removeBookFromStorage(book);
          }
        });

        // Create the due date element container
        const dueDateElement = document.createElement("p");
        dueDateElement.className = "due-date";

        // Add appropriate class based on due date
        if (dueDate < today) {
          dueDateElement.classList.add("overdue");
        } else if (dueDate <= twoWeeksFromNow) {
          dueDateElement.classList.add("due-soon");
        }

        dueDateElement.appendChild(dueDateSpan);
        dueDateElement.appendChild(titleSpan);
        dueDateElement.appendChild(removeButton);
        bookElement.appendChild(dueDateElement);
      });

      stateElement.appendChild(bookElement);
    });

    virtualShelfContainer.appendChild(stateElement);
  });
})();
