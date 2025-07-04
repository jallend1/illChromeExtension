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
    const bookElement = document.createElement("div");
    const libraryName =
      book.borrowingAddress.attention + " - " + book.borrowingAddress.line1;
    const dueDate = new Date(book.dueDate);
    const libraryState = book.borrowingAddress.region;
    const headingState = document.createElement("h2");
    headingState.textContent = `${libraryState}`;
    bookElement.className = "book";
    bookElement.textContent = `${book.title} - ${libraryName}`;
    bookElement.appendChild(headingState);
    virtualShelfContainer.appendChild(bookElement);
  });
})();
