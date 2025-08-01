(async () => {
  const virtualShelfContainer = document.getElementById(
    "virtual-shelf-container"
  );
  const exportShelfButton = document.getElementById("export-shelf");
  const importShelfButton = document.getElementById("import-shelf");
  const clearShelfButton = document.getElementById("clear-shelf");

  virtualShelfContainer.innerHTML = `<div class="loading">Loading virtual book shelf...</div>`;

  // *****************
  // Utility functions
  // *****************

  // Extract Virtual Shelf from local storage
  const getVirtualShelf = async () => {
    return new Promise((resolve) => {
      chrome.storage.local.get("virtualBookShelf", (data) => {
        resolve(data.virtualBookShelf || []);
      });
    });
  };

  // Update Virtual Shelf in local storage
  const updateVirtualShelf = async (shelf) => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ virtualBookShelf: shelf }, () => {
        resolve();
        location.reload();
      });
    });
  };

  // Copy to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Failed to copy text: ", err);
      return false;
    }
  };

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
    updateVirtualShelf(updatedShelf);
  };

  // *******************
  // * Event Listeners *
  // *******************

  // Copies the virtual book shelf data to clipboard
  exportShelfButton.addEventListener("click", () => {
    const shelfData = JSON.stringify(virtualBookShelf, null, 2);
    copyToClipboard(shelfData).then((success) => {
      if (success) {
        alert("Virtual book shelf data copied to clipboard!");
      }
    });
  });

  // Clear the virtual book shelf
  clearShelfButton.addEventListener("click", () => {
    if (
      confirm(
        "Are you sure you want to clear the virtual book shelf? This is irreversible!"
      )
    ) {
      // Copy the current shelf to clipboard before clearing, just in case!
      const shelfData = JSON.stringify(virtualBookShelf, null, 2);
      copyToClipboard(shelfData);
      updateVirtualShelf([]);
    }
  });

  // Opens dialog to import virtual book shelf data
  importShelfButton.addEventListener("click", () => {
    const input = prompt("Paste virtual book shelf data here:");
    if (input) {
      try {
        const importedShelf = JSON.parse(input);
        if (Array.isArray(importedShelf)) {
          updateVirtualShelf(importedShelf);
        } else {
          alert("Invalid data format. Please provide a valid JSON array.");
        }
      } catch (error) {
        alert("Failed to parse JSON. Please check your input.");
        console.error("Import error:", error);
      }
    }
  });

  const virtualBookShelf = await getVirtualShelf();
  console.log("Virtual Book Shelf:", virtualBookShelf);

  virtualShelfContainer.innerHTML = ""; // Clear loading state
  if (!virtualBookShelf || virtualBookShelf.length === 0) {
    virtualShelfContainer.innerHTML = `
      <div class="empty-state">
        <h3>No virtual book shelf found. :(</h3>
      </div>
    `;
  }

  // Group books by state and library, then sort
  const booksByState = {};

  virtualBookShelf.forEach((book) => {
    const libraryState = book.borrowingAddress?.region;
    const libraryName =
      book.borrowingAddress?.attention + " - " + book.borrowingAddress?.line1;

    if (!booksByState[libraryState]) {
      booksByState[libraryState] = {};
    }

    if (!booksByState[libraryState][libraryName]) {
      booksByState[libraryState][libraryName] = [];
    }

    booksByState[libraryState][libraryName].push(book);
  });

  // Sort states alphabetically
  const sortedStates = Object.keys(booksByState).sort((a, b) =>
    a.localeCompare(b)
  );

  // Create state containers and populate with sorted libraries
  sortedStates.forEach((libraryState) => {
    // Create state container to hold heading and library container
    const stateElement = document.createElement("div");
    stateElement.className = "state-container";
    stateElement.id = libraryState.replace(/\s+/g, "-").toLowerCase();

    // Create heading for the state
    const headingState = document.createElement("h2");
    headingState.className = "state";
    headingState.id = libraryState.replace(/\s+/g, "-").toLowerCase();
    headingState.textContent = libraryState;
    stateElement.appendChild(headingState);

    // Create container holding all library cards for this state
    const libraryContainer = document.createElement("div");
    libraryContainer.className = "library-container";
    stateElement.appendChild(libraryContainer);

    // Sort libraries within this state alphabetically
    const sortedLibraries = Object.keys(booksByState[libraryState]).sort(
      (a, b) => a.localeCompare(b)
    );

    // Create library elements in sorted order
    sortedLibraries.forEach((libraryName) => {
      const books = booksByState[libraryState][libraryName];

      // Create a card element for this library
      const libraryCard = document.createElement("div");
      libraryCard.className = "library-card";

      // Create and append the library name element
      const libraryNameElement = document.createElement("h3");
      libraryNameElement.className = "library-name";
      libraryNameElement.textContent = libraryName;
      libraryCard.appendChild(libraryNameElement);

      // Create a Return All button for each library
      const returnAllButton = document.createElement("button");
      returnAllButton.className = "return-all-button";
      returnAllButton.textContent = "Return All";
      returnAllButton.addEventListener("click", async () => {
        if (
          confirm(
            `Are you sure you want to return all books from ${libraryName}?`
          )
        ) {
          // Get the latest shelf from storage
          const currentShelf = await getVirtualShelf();
          // Filters out all books from this library
          const updatedShelf = currentShelf.filter(
            (book) =>
              !(
                book.borrowingAddress?.attention ===
                  books[0].borrowingAddress?.attention &&
                book.borrowingAddress?.line1 ===
                  books[0].borrowingAddress?.line1
              )
          );
          updateVirtualShelf(updatedShelf);
        }
      });
      libraryCard.appendChild(returnAllButton);

      // Create a container for the books in this library
      const bookContainer = document.createElement("div");
      bookContainer.className = "book-container";
      libraryCard.appendChild(bookContainer);

      // Add all books from this library
      books.forEach((book) => {
        const bookElement = document.createElement("div");
        bookElement.className = "book-details";
        bookContainer.appendChild(bookElement);

        const dueDate = new Date(book.dueDate);
        const title = book.title;

        // Get current date and calculate date differences for styling
        const today = new Date();
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(today.getDate() + 14);

        // Create individual spans for due date and title
        const dueDateElement = document.createElement("p");
        dueDateElement.className = "due-date";
        dueDateElement.textContent = `${dueDate.toLocaleDateString()}`;

        const titleElement = document.createElement("p");
        titleElement.className = "title";
        const titleText =
          title.length > 25 ? title.substring(0, 25) + "..." : title;
        titleElement.textContent = titleText.replace(/:/g, "");

        // Create remove button
        const removeButton = document.createElement("button");
        removeButton.classList.add("remove-button");
        removeButton.textContent = "Clear";

        // Add click handler to remove button
        removeButton.addEventListener("click", () => {
          if (confirm(`Are you sure you want to remove "${title}"?`)) {
            removeBookFromStorage(book);
          }
        });

        // Add appropriate class based on due date
        if (dueDate < today) {
          dueDateElement.classList.add("overdue");
        } else if (dueDate <= twoWeeksFromNow) {
          dueDateElement.classList.add("due-soon");
        }

        bookElement.appendChild(dueDateElement);
        bookElement.appendChild(titleElement);
        bookElement.appendChild(removeButton);

        bookContainer.appendChild(bookElement);
      });

      libraryContainer.appendChild(libraryCard);
    });

    virtualShelfContainer.appendChild(stateElement);
  });
})();
