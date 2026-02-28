import { storageKeys, MESSAGE_TYPES } from "./constants.js";

import { handleURLChange } from "./buttonManager.js";

// State management using closures
let windowId = null;
let currentTabUrl = "";

/**
 * Initialize the message handler with window ID
 * @param {number} id - The window ID
 */
export const initializeMessageHandler = (id) => {
  windowId = id;
};

/**
 * Get current tab URL
 * @returns {string} Current tab URL
 */
export const getCurrentTabUrl = () => currentTabUrl;

/**
 * Set current tab URL
 * @param {string} url - The URL to set
 */
export const setCurrentTabUrl = (url) => {
  currentTabUrl = url;
};

/**
 * Handles tab URL updates
 * @param {Object} message - The message object
 * @param {Function} sendResponse - Response callback
 */
const handleTabUrlUpdate = (message, sendResponse) => {
  if (message.windowId === windowId) {
    currentTabUrl = message.url || "";
    handleURLChange(currentTabUrl);
    sendResponse && sendResponse({ status: "URL handled" });
  }
};

/**
 * Handles storage updates
 * @param {Object} message - The message object
 */
const handleStorageUpdate = (message) => {
  for (const [key, { newValue }] of Object.entries(message.changes)) {
    const storageKey = storageKeys.find((sk) => sk.key === key);
    if (storageKey && storageKey.element) {
      storageKey.element.checked = newValue;
    }
  }
};

/**
 * Main message handler function
 * @param {Object} message - The message object
 * @param {Object} sender - The message sender
 * @param {Function} sendResponse - Response callback
 */
export const handleMessage = (message, sender, sendResponse) => {

  switch (message.type) {
    case MESSAGE_TYPES.TAB_URL_UPDATED:
      handleTabUrlUpdate(message, sendResponse);
      break;
    case MESSAGE_TYPES.STORAGE_UPDATED:
      handleStorageUpdate(message);
      break;
    case MESSAGE_TYPES.ADDRESS_READY:
      if (message.data) {
        navigator.clipboard
          .writeText(message.data)
          .catch((err) => console.error("Failed to copy address to clipboard:", err));
      }
      break;
    case MESSAGE_TYPES.OVERDUE_NOTICE_READY:
      if (message.data) {
        navigator.clipboard
          .writeText(message.data)
          .catch((err) => console.error("Failed to copy overdue notice to clipboard:", err));
      }
      break;
    case MESSAGE_TYPES.LIBRARY_INVOICE_READY:
      if (message.data) {
        const htmlBlob = new Blob([message.data.html], { type: "text/html" });
        const textBlob = new Blob([message.data.text], { type: "text/plain" });
        navigator.clipboard
          .write([new ClipboardItem({ "text/html": htmlBlob, "text/plain": textBlob })])
          .catch((err) => console.error("Failed to copy invoice to clipboard:", err));
      }
      break;
    default:
      console.log("Unhandled message type:", message.type);
  }
};
