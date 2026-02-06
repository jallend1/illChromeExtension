import { elements } from "./constants.js";
import {
  parseMailData,
  toggleSection,
  initiateScript,
  addCheckboxListener,
} from "./utils.js";
import { setupBookPricingListeners } from "./bookPricing.js";

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
    // Make the entire header clickable
    const header = toggle.parentElement;
    header.addEventListener("click", () => {
      const mainSection = header.nextElementSibling;
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
 * Sets up settings modal open/close listeners
 */
const setupSettingsModal = () => {
  const gearButton = document.querySelector("#settings-gear");
  const backdrop = document.querySelector("#settings-backdrop");
  const modal = document.querySelector("#settings-modal");

  if (!gearButton || !backdrop || !modal) return;

  const openModal = () => {
    backdrop.classList.remove("hidden");
    modal.classList.remove("hidden");
    // Trigger reflow so the transition plays
    backdrop.offsetHeight;
    backdrop.classList.add("visible");
    modal.classList.add("visible");
  };

  const closeModal = () => {
    backdrop.classList.remove("visible");
    modal.classList.remove("visible");
    const onEnd = () => {
      backdrop.classList.add("hidden");
      modal.classList.add("hidden");
      modal.removeEventListener("transitionend", onEnd);
    };
    modal.addEventListener("transitionend", onEnd);
  };

  gearButton.addEventListener("click", openModal);
  backdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
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
  setupSettingsModal();
};
