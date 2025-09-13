// Description: This module handles the creation of a button to add items to the virtual bookshelf
// and the logic for extracting book information from the current page.
// Called from worldShareMods.js

const {
  waitForElementWithInterval,
  ignoreHiddenElements,
  buttonStyles,
  hoverStyles,
  createMiniModal,
  isLendingRequestPage,
} = await import(chrome.runtime.getURL("modules/utils.js"));

const { borrowingAddressSelectors, borrowingSelectors, lendingSelectors } =
  await import(chrome.runtime.getURL("modules/constants.js"));

/**
 * Extracts the borrowing address elements from the page.
 * @returns {Promise<Object>} - An object containing the borrowing address elements
 */
const extractBorrowingAddressElements = async () => {
  const elements = {};
  for (const [key, selector] of Object.entries(borrowingAddressSelectors)) {
    elements[key] = await waitForElementWithInterval(() =>
      ignoreHiddenElements(selector)
    );
  }
  return elements;
};

/**
 * Retrieves the virtual bookshelf from Chrome's local storage.
 * @returns {Promise<Array>} - An array of books in the virtual bookshelf
 */
const getVirtualBookShelf = async () => {
  const storedBookshelf = await new Promise((resolve) => {
    chrome.storage.local.get("virtualBookShelf", (result) => {
      resolve(result.virtualBookShelf || []);
    });
  });
  return storedBookshelf;
};

/**
 * Adds a book to the virtual bookshelf in Chrome's local storage.
 * @param {*} book - The book object to add to the virtual bookshelf
 */
const addBookToVirtualBookShelf = async (book) => {
  const virtualBookShelf = await getVirtualBookShelf();
  virtualBookShelf.push(book);
  await new Promise((resolve) => {
    chrome.storage.local.set({ virtualBookShelf }, resolve);
  });
  createMiniModal(
    `Added "${book.title}" to your Virtual Bookshelf.`,
    false,
    2000
  );
  console.log("Current Virtual Bookshelf:", virtualBookShelf);
};

/**
 * Compiles the address data from the borrowing address elements.
 * @returns {Promise<Object>} - An object containing the compiled address data
 */
const compileAddressData = async () => {
  const borrowingAddressElements = await extractBorrowingAddressElements();
  // console.log("Borrowing Address Elements:", borrowingAddressElements);
  const addressData = {
    attention: borrowingAddressElements?.attention?.value || null,
    line1: borrowingAddressElements?.line1?.value || null,
    line2: borrowingAddressElements?.line2?.value || null,
    locality: borrowingAddressElements?.locality?.value || null,
    region: borrowingAddressElements?.region?.textContent?.trim() || null,
    postal: borrowingAddressElements?.postal?.value || null,
  };
  return addressData;
};

/**
 * Extracts book information from the DOM based on the provided active selectors.
 * @param {*} activeSelectors - The active selectors to use for extracting book information
 * @returns {Promise<Object>} - An object containing the extracted book information
 */
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

/**
 * Handles the click event for adding a book to the virtual bookshelf.
 * @returns {Promise<void>}
 */
const virtualBookShelfClick = async () => {
  const isLendingRequest = await isLendingRequestPage();
  if (isLendingRequest) {
    alert("This feature is not available on lending request pages.");
    return;
  }
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

/**
 * Checks if the current library already exists in the virtual bookshelf.
 * @returns {Promise<boolean>} - True if the library already exists in the virtual bookshelf, false otherwise
 */
export const doesLibraryAlreadyExist = async () => {
  const addressData = await compileAddressData();
  const virtualBookShelf = await getVirtualBookShelf();
  const exists = virtualBookShelf.some((book) => {
    return (
      book.borrowingAddress?.attention === addressData.attention &&
      book.borrowingAddress?.line1 === addressData.line1
    );
  });
  return exists;
};

/**
 * Creates and appends the "Add to Virtual Bookshelf" button to the sidebar.
 * @returns {Promise<void>}
 */
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
