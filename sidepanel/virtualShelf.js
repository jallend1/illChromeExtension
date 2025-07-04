(async () => {
  console.log("Virtual Shelf script loaded");
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

    // Create elements
    const bookElement = document.createElement("div");
    bookElement.className = "book";
    const headingState = document.createElement("h2");
    const dueDateElement = document.createElement("p");
    const libraryNameElement = document.createElement("h3");

    // Set text content
    headingState.textContent = `${libraryState}`;
    dueDateElement.textContent = `${dueDate.toLocaleDateString()} - ${title}`;
    libraryNameElement.textContent = `${libraryName}`;

    bookElement.appendChild(headingState);
    bookElement.appendChild(libraryNameElement);
    bookElement.appendChild(dueDateElement);
    virtualShelfContainer.appendChild(bookElement);
  });
})();
