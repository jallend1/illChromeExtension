import { BUTTON_GROUPS, URL_PATTERNS } from "./constants.js";

/**
 * Enables the specified buttons
 * @param {string[]} buttonIds - The IDs of the buttons to enable
 */
export const enableButtons = (buttonIds) => {
  buttonIds.forEach((buttonId) => {
    const button = document.querySelector(`#${buttonId}`);
    if (button) {
      button.disabled = false;
    } else {
      console.warn(`Button with ID ${buttonId} not found in DOM`);
    }
  });
};

/**
 * Disables the specified buttons
 * @param {string[]} buttonIds - The IDs of the buttons to disable
 */
export const disableButtons = (buttonIds) => {
  buttonIds.forEach((buttonId) => {
    const button = document.querySelector(`#${buttonId}`);
    if (button) {
      button.disabled = true;
    }
  });
};

/**
 * Handles URL changes and updates button states
 * @param {string} url - The new URL of the active tab
 */
export const handleURLChange = (url) => {

  // Always disable all buttons first
  disableButtons(BUTTON_GROUPS.EVERGREEN);
  disableButtons(BUTTON_GROUPS.WORLDSHARE);

  if (typeof url !== "string") {
    console.warn("URL is not a string:", typeof url);
    return;
  }

  // Enable appropriate buttons based on URL
  if (url.includes(URL_PATTERNS.EVERGREEN)) {
    enableButtons(BUTTON_GROUPS.EVERGREEN);
  }

  if (url.includes(URL_PATTERNS.WORLDSHARE)) {
    enableButtons(BUTTON_GROUPS.WORLDSHARE);
  }
};
