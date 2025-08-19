import { elements } from "./constants.js";
import {
  parseMailData,
  toggleSection,
  initiateScript,
  addCheckboxListener,
} from "./utils.js";

/**
 * Sets up passive tools toggle listener
 */
const setupPassiveToolsListener = () => {
  if (!elements.passiveTools) return;

  elements.passiveTools.addEventListener("click", () => {
    chrome.storage.local.get("arePassiveToolsActive", (result) => {
      chrome.storage.local.set(
        { arePassiveToolsActive: !result.arePassiveToolsActive },
        () => {
          const newState = !result.arePassiveToolsActive;
          elements.passiveTools.checked = newState;
          chrome.runtime.sendMessage({ command: "toggleExtension" });
        }
      );
    });
  });
};

/**
 * Sets up ILL actions button listeners
 */
const setupIllActionsListeners = () => {
  if (!elements.illActions) return;

  elements.illActions.forEach((button) => {
    button.addEventListener("click", (event) => {
      initiateScript(event.target.id);
    });
  });
};

/**
 * Sets up collapse toggle listeners
 */
const setupCollapseToggleListeners = () => {
  if (!elements.collapseToggle) return;

  elements.collapseToggle.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const mainSection = toggle.parentElement.nextElementSibling;
      toggleSection(toggle, mainSection);
    });
  });
};

/**
 * Sets up other button listeners
 */
const setupButtonListeners = () => {
  // Disable button
  if (elements.disableButton) {
    elements.disableButton.addEventListener("click", () => {
      chrome.runtime.sendMessage({ command: "disableButton" });
    });
  }

  // Lending mode
  if (elements.lendingMode) {
    elements.lendingMode.addEventListener("click", () => {
      initiateScript("frequentLending");
      chrome.storage.local.set({
        lendingMode: elements.lendingMode.checked,
      });
    });
  }

  // Import mailroom data
  if (elements.importMailroomData) {
    elements.importMailroomData.addEventListener("click", async () => {
      try {
        const mailData = await parseMailData();
        if (mailData) {
          chrome.storage.local.set({ mailData: mailData.data });
          alert("Mailroom data imported successfully!");
        } else {
          alert("Failed to import mailroom data.");
        }
      } catch (error) {
        console.error("Error importing mailroom data:", error);
        alert("Failed to import mailroom data.");
      }
    });
  }
};

const setupBookPricingListeners = () => {
  const checkBookPriceBtn = document.getElementById("checkBookPrice");
  if (checkBookPriceBtn) {
    checkBookPriceBtn.addEventListener("click", async () => {
      const searchTerm = prompt("Enter ISBN, title, or author to search:");
      if (!searchTerm || searchTerm.trim() === "") return;

      try {
        checkBookPriceBtn.disabled = true;
        checkBookPriceBtn.textContent = "Opening Kinokuniya...";

        console.log(`Opening Kinokuniya search for: "${searchTerm}"`);

        // Send message to background script to open the tab
        await chrome.runtime.sendMessage({
          command: "openKinokuniyaSearch",
          searchTerm: searchTerm.trim(),
        });
      } catch (error) {
        console.error("Failed to open Kinokuniya search:", error);
        alert("Failed to open search: " + error.message);
      } finally {
        checkBookPriceBtn.disabled = false;
        checkBookPriceBtn.textContent = "Check Book Price";
      }
    });
  }
};

/**
 * Sets up checkbox listeners
 */
const setupCheckboxListeners = () => {
  const checkboxes = [
    { element: elements.autoReceiveRequestButton, key: "autoReceiveRequest" },
    { element: elements.printLabel, key: "printLabel" },
    { element: elements.autoReturnILL, key: "autoReturnILL" },
  ];

  checkboxes.forEach(({ element, key }) => {
    addCheckboxListener(element, key);
  });
};

/**
 * Sets up keyboard shortcuts
 */
const setupKeyboardShortcuts = () => {
  document.addEventListener("DOMContentLoaded", () => {
    if (!chrome.commands) return;

    chrome.commands.getAll((commands) => {
      commands.forEach((cmd) => {
        if (cmd.shortcut) {
          const tooltip = document.querySelector(`#${cmd.name} .tooltiptext`);
          if (tooltip) {
            tooltip.textContent = `Press ${cmd.shortcut}`;
          }
        }
      });
    });
  });
};

/**
 * Initialize all event listeners
 */
export const initializeEventListeners = () => {
  setupPassiveToolsListener();
  setupIllActionsListeners();
  setupCollapseToggleListeners();
  setupButtonListeners();
  setupCheckboxListeners();
  setupKeyboardShortcuts();
  setupBookPricingListeners();
};
