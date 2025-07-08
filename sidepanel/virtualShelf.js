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

  virtualBookShelf.forEach((book) => {
    // Assign values to variables
    const libraryName =
      book.borrowingAddress.attention + " - " + book.borrowingAddress.line1;
    const dueDate = new Date(book.dueDate);
    const libraryState = book.borrowingAddress.region;
    const title = book.title;

    // Check if the state is already displayed on the page
    const existingStateElement = document.getElementById(
      libraryState.replace(/\s+/g, "-").toLowerCase()
    );
    if (existingStateElement) {
      console.log(
        `State ${libraryState} already exists! Find a way to add this book to it.`
      );
    }

    // Create elements
    const bookElement = document.createElement("div");
    bookElement.className = "book";
    const headingState = document.createElement("h2");
    headingState.className = "state";
    headingState.id = libraryState.replace(/\s+/g, "-").toLowerCase();
    headingState.textContent = `${libraryState}`;
    const dueDateElement = document.createElement("p");
    dueDateElement.className = "due-date";
    const libraryNameElement = document.createElement("h3");
    libraryNameElement.className = "library-name";

    // Create individual spans for due date and title
    const dueDateSpan = document.createElement("span");
    dueDateSpan.className = "due-date-span";
    dueDateSpan.textContent = dueDate.toLocaleDateString();

    const titleSpan = document.createElement("span");
    titleSpan.className = "title-span";
    titleSpan.textContent = title;

    // Set text content
    headingState.textContent = `${libraryState}`;
    libraryNameElement.textContent = `${libraryName}`;

    // Append spans to the due date element
    dueDateElement.appendChild(dueDateSpan);
    dueDateElement.appendChild(document.createTextNode(" - "));
    dueDateElement.appendChild(titleSpan);

    bookElement.appendChild(headingState);
    bookElement.appendChild(libraryNameElement);
    bookElement.appendChild(dueDateElement);
    virtualShelfContainer.appendChild(bookElement);
  });
})();
