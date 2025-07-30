// Description: This module handles the creation of a button to add items to the virtual bookshelf
// and the logic for extracting book information from the current page.
// Called from worldShareMods.js

const {
  waitForElementWithInterval,
  ignoreHiddenElements,
  buttonStyles,
  hoverStyles,
} = await import(chrome.runtime.getURL("modules/utils.js"));

const { borrowingAddressSelectors, borrowingSelectors, lendingSelectors } =
  await import(chrome.runtime.getURL("modules/constants.js"));

// Extract borrowing address elements
const extractBorrowingAddressElements = async () => {
  const elements = {};
  for (const [key, selector] of Object.entries(borrowingAddressSelectors)) {
    elements[key] = await waitForElementWithInterval(() =>
      ignoreHiddenElements(selector)
    );
  }
  return elements;
};

// Retrieve the existing virtualBookShelf from local storage or initialize it
const getVirtualBookShelf = async () => {
  const storedBookshelf = await new Promise((resolve) => {
    chrome.storage.local.get("virtualBookShelf", (result) => {
      resolve(result.virtualBookShelf || []);
    });
  });
  return storedBookshelf;
};

const addBookToVirtualBookShelf = async (book) => {
  const virtualBookShelf = await getVirtualBookShelf();
  virtualBookShelf.push(book);
  await new Promise((resolve) => {
    chrome.storage.local.set({ virtualBookShelf }, resolve);
  });
  console.log("Current Virtual Bookshelf:", virtualBookShelf);
};

const compileAddressData = async () => {
  const borrowingAddressElements = await extractBorrowingAddressElements();
  const addressData = {
    attention: borrowingAddressElements.attention.value,
    line1: borrowingAddressElements.line1.value,
    line2: borrowingAddressElements.line2.value,
    locality: borrowingAddressElements.locality.value,
    region: borrowingAddressElements.region.textContent.trim(),
    postal: borrowingAddressElements.postal.value,
  };
  return addressData;
};

const extractBookFromDOM = async (activeSelectors) => {
  const bookObject = {
    title: "",
    dueDate: "",
    borrowingAddress: {},
  };
  const addressData = await compileAddressData();
  const dueDateElement = await waitForElementWithInterval(
    activeSelectors.dueDateElement
  );
  const dueDate = dueDateElement?.textContent.trim() || "";
  const titleElement = await waitForElementWithInterval(
    activeSelectors.titleElement
  );
  const title = titleElement?.textContent.trim() || "";
  bookObject.title = title;
  bookObject.dueDate = dueDate;
  bookObject.borrowingAddress = addressData;
  console.log("Book Object:", bookObject);
  return bookObject;
};

const virtualBookShelfClick = async () => {
  const isQueueUrl = window.currentUrl.includes("queue");
  const activeSelectors = isQueueUrl
    ? borrowingSelectors.queue
    : borrowingSelectors.direct;
  const book = await extractBookFromDOM(activeSelectors);
  if (book.title) {
    await addBookToVirtualBookShelf(book);
    console.log("Book added to virtual bookshelf:", book);
  } else {
    console.error("No book title found. Cannot add to virtual bookshelf.");
  }
};

// Check if current library already exists in shelf
export const doesLibraryAlreadyExist = async () => {
  const addressData = await compileAddressData();
  const virtualBookShelf = await getVirtualBookShelf();
  console.log("Checking if library exists:", addressData);
  console.log("Current Virtual Bookshelf:", virtualBookShelf);
  console.log(
    "Library exists:",
    virtualBookShelf.some((book) => {
      return (
        book.borrowingAddress?.attention === addressData.attention &&
        book.borrowingAddress?.line1 === addressData.line1
      );
    })
  );
};

export const createAddToBookshelfButton = async () => {
  const parentElement = await waitForElementWithInterval("#sidebar-nd > div");
  if (!document.querySelector("#add-to-bookshelf-button")) {
    const button = document.createElement("button");
    button.innerText = "Add to Virtual Bookshelf";
    button.id = "add-to-bookshelf-button";
    Object.assign(button.style, buttonStyles);
    button.style.fontSize = "1rem";
    button.addEventListener("mouseover", () => {
      Object.assign(button.style, hoverStyles);
      button.style.fontSize = "1rem";
    });
    button.addEventListener("mouseout", () => {
      Object.assign(button.style, buttonStyles);
      button.style.fontSize = "1rem";
    });
    button.addEventListener("click", () => {
      virtualBookShelfClick();
    });
    parentElement.appendChild(button);
  }
};
