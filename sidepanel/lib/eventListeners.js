import { elements } from "./constants.js";
import {
  parseMailData,
  toggleSection,
  initiateScript,
  addCheckboxListener,
} from "./utils.js";
import { setupBookPricingListeners } from "./bookPricing.js";
import { getBaseURL } from "../../background-utils.js";

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

  // Extract ISBNs from Ingram
  if (elements.extractIngramISBNs) {
    elements.extractIngramISBNs.addEventListener("click", () => {
      chrome.runtime.sendMessage({ data: "extractIngramISBNs" });
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
 * Updates the "Copy WorldShare Address" button text based on
 * the current state of the Print Label and Return Request toggles.
 */
const syncCopyAddressButtonText = () => {
  const button = document.querySelector("#copyWorldShareAddress");
  if (!button) return;

  const printLabel = elements.printLabel?.checked;
  const returnRequest = elements.autoReturnILL?.checked;

  if (printLabel && returnRequest) {
    button.textContent = "Print Label and Return";
  } else if (printLabel) {
    button.textContent = "Print Label";
  } else if (returnRequest) {
    button.textContent = "Return Request";
  } else {
    button.textContent = "Copy WorldShare Address";
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

  if (elements.printLabel) elements.printLabel.addEventListener("change", syncCopyAddressButtonText);
  if (elements.autoReturnILL) elements.autoReturnILL.addEventListener("change", syncCopyAddressButtonText);
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
 * Sets up Selection List modal open/close listeners
 */
const setupSelectionListModal = () => {
  const button = document.querySelector("#selection-list");
  const backdrop = document.querySelector("#selection-list-backdrop");
  const modal = document.querySelector("#selection-list-modal");

  if (!button || !backdrop || !modal) return;

  const openModal = () => {
    backdrop.classList.remove("hidden");
    modal.classList.remove("hidden");
    backdrop.offsetHeight;
    backdrop.classList.add("visible");
    modal.classList.add("visible");
    modal.querySelector("#selection-list-input").focus();
  };

  const closeModal = () => {
    const note = modal.querySelector("#selection-list-ingram-note");
    if (note) note.classList.add("hidden");
    backdrop.classList.remove("visible");
    modal.classList.remove("visible");
    const onEnd = () => {
      backdrop.classList.add("hidden");
      modal.classList.add("hidden");
      modal.removeEventListener("transitionend", onEnd);
    };
    modal.addEventListener("transitionend", onEnd);
  };

  const input = modal.querySelector("#selection-list-input");
  const searchButton = modal.querySelector("#selection-list-search");

  const syncSearchButton = () => {
    if (!searchButton) return;
    const hasContent = input.value.trim().length > 0;
    searchButton.disabled = !hasContent;
    searchButton.style.opacity = hasContent ? "1" : "0.5";
    searchButton.style.cursor = hasContent ? "pointer" : "not-allowed";
  };

  if (input) {
    input.addEventListener("input", syncSearchButton);
    syncSearchButton(); // set initial state
  }

  const cancelButton = document.querySelector("#selection-list-cancel");
  if (cancelButton) cancelButton.addEventListener("click", closeModal);

  const clearButton = document.querySelector("#selection-list-clear");
  if (clearButton) clearButton.addEventListener("click", () => {
    input.value = "";
    syncSearchButton();
  });

  if (searchButton) {
    searchButton.addEventListener("click", async () => {
      const isbns = input.value.split("\n").map((s) => s.trim()).filter((s) => s !== "");
      if (isbns.length === 0) return;

      const base = await getBaseURL("/eg2/en-US/staff/catalog/search");
      const params = new URLSearchParams({ org: "1", limit: isbns.length });
      isbns.forEach((isbn) => params.append("query", isbn));
      isbns.forEach(() => params.append("fieldClass", "identifier"));
      isbns.forEach((_, i) => params.append("joinOp", i === 0 ? "" : "||"));
      isbns.forEach(() => params.append("matchOp", "contains"));
      params.append("dateOp", "is");
      params.append("ridx", "1");

      window.open(`${base}?${params.toString()}`, "_blank");
    });
  }

  button.addEventListener("click", openModal);
  backdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
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
export { syncCopyAddressButtonText };

export const initializeEventListeners = () => {
  setupPassiveToolsListener();
  setupIllActionsListeners();
  setupCollapseToggleListeners();
  setupButtonListeners();
  setupCheckboxListeners();
  setupKeyboardShortcuts();
  setupBookPricingListeners();
  setupSettingsModal();
  setupSelectionListModal();
};
