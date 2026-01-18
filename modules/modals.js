/**
 * Injects the modal CSS into the page if not already present
 */
const injectModalStyles = () => {
  if (!document.getElementById("powill-modal-styles")) {
    const style = document.createElement("style");
    style.id = "powill-modal-styles";
    style.textContent = `
      /* Modal Base Styles */
      #powILL-modal {
        border-radius: 1rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: #000;
        font-size: 4rem;
        border: 1px solid #000;
        box-shadow: 0 0 10px 5px #000;
      }

      /* Modal Header */
      .powill-modal-header {
        padding: 1rem;
        border-radius: 1rem 1rem 0 0;
        text-align: center;
      }

      .powill-modal-image {
        width: 100px;
        height: 100px;
        border-radius: 50%;
      }

      /* Modal Body */
      .powill-modal-body {
        background-color: #f9f9f9;
        text-align: center;
        border-radius: 0 0 1rem 1rem;
        padding: 1rem;
      }

      .powill-modal-heading {
        font-size: 2rem;
        font-weight: thin;
        padding: 1rem;
        color: #3b607c;
        margin: 0;
      }

      .powill-modal-message {
        font-size: 1rem;
        color: #3b607c;
        margin: 0;
      }

      /* Modal Buttons */
      .powill-modal-button {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.5rem;
        color: #fff;
        font-size: 1.5rem;
        cursor: pointer;
      }

      .powill-modal-button:hover {
        opacity: 0.9;
      }

      /* Input Modal Specific Styles */
      .powill-modal-input {
        padding: 0.5rem;
        border: 2px solid;
        border-radius: 0.5rem;
        font-size: 1.5rem;
        text-align: center;
        width: 120px;
        margin-bottom: 1rem;
      }

      .powill-modal-input::placeholder {
        color: #999;
      }

      .powill-modal-button-group {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
        margin-top: 1rem;
      }

      .powill-modal-button-cancel {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.5rem;
        background-color: #999;
        color: #fff;
        font-size: 1.5rem;
        cursor: pointer;
      }

      .powill-modal-button-cancel:hover {
        opacity: 0.9;
      }

      .powill-modal-button-submit {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.5rem;
        color: #fff;
        font-size: 1.5rem;
        cursor: pointer;
      }

      .powill-modal-button-submit:hover {
        opacity: 0.9;
      }

      /* Warning Message */
      .powill-modal-warning {
        font-size: 1rem;
        color: #e85e6a;
        margin: 0.5rem 0;
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);
  }
};

/**
 * Displays a status modal with a heading, message, background color, and image.
 * @param {string} heading - The heading text for the modal.
 * @param {string} message - The message text for the modal.
 * @param {string} backgroundColor - The background color for the modal.
 * @param {string} imgURL - The image URL to display in the modal.
 */
export const statusModal = (heading, message, backgroundColor, imgURL) => {
  injectModalStyles();
  const existingModal = document.getElementById("powILL-modal");
  if (existingModal) {
    existingModal.remove();
  }
  const modal = document.createElement("div");
  modal.setAttribute("id", "powILL-modal");

  // Apply critical positioning styles inline to ensure immediate effect
  Object.assign(modal.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: "1000"
  });

  modal.innerHTML = `
    <div>
      <div class="powill-modal-header" style="background-color: ${backgroundColor};">
        <img src="${imgURL}" class="powill-modal-image" alt="Modal icon">
      </div>
      <div class="powill-modal-body">
        <h2 class="powill-modal-heading">${heading}</h2>
        <p class="powill-modal-message">${message}</p>
        <button id="close-button" class="powill-modal-button" style="background-color: ${backgroundColor};">
          Close
        </button>
      </div>
    </div>
  `;

  const closeButton = modal.querySelector("#close-button");
  closeButton.addEventListener("click", () => {
    modal.remove();
  });

  document.body.appendChild(modal);
  setTimeout(() => {
    modal.remove();
  }, 3000);
};

/**
 * Displays an input modal with a prompt and returns the user's input.
 * @param {string} heading - The heading text for the modal.
 * @param {string} message - The prompt message for the input.
 * @param {string} backgroundColor - The background color for the modal header.
 * @param {string} imgURL - The image URL to display in the modal.
 * @returns {Promise<string|null>} A promise that resolves with the user's input or null if cancelled.
 */
export const inputModal = (heading, message, backgroundColor, imgURL) => {
  injectModalStyles();
  return new Promise((resolve) => {
    const existingModal = document.getElementById("powILL-modal");
    if (existingModal) {
      existingModal.remove();
    }
    const modal = document.createElement("div");
    modal.setAttribute("id", "powILL-modal");

    // Apply critical positioning styles inline to ensure immediate effect
    Object.assign(modal.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: "1000"
    });

    modal.innerHTML = `
      <div>
        <div class="powill-modal-header" style="background-color: ${backgroundColor};">
          <img src="${imgURL}" class="powill-modal-image" alt="Modal icon">
        </div>
        <div class="powill-modal-body">
          <h2 class="powill-modal-heading">${heading}</h2>
          <p class="powill-modal-message" style="margin-bottom: 1rem;">${message}</p>
          <input
            type="text"
            id="modal-input"
            class="powill-modal-input"
            maxlength="4"
            pattern="[0-9]{4}"
            style="border-color: ${backgroundColor};"
            placeholder="####"
          >
          <div class="powill-modal-button-group">
            <button id="cancel-button" class="powill-modal-button-cancel">
              Cancel
            </button>
            <button id="submit-button" class="powill-modal-button-submit" style="background-color: ${backgroundColor};">
              Submit
            </button>
          </div>
        </div>
      </div>
    `;

    const inputField = modal.querySelector("#modal-input");
    const submitButton = modal.querySelector("#submit-button");
    const cancelButton = modal.querySelector("#cancel-button");

    let warningShown = false;

    const showWarning = () => {
      let warningElement = modal.querySelector("#warning-message");
      if (!warningElement) {
        warningElement = document.createElement("p");
        warningElement.id = "warning-message";
        warningElement.className = "powill-modal-warning";
        warningElement.textContent =
          "WCCLS would like a four digit number here. Press enter again if you want to break their hearts.";
        inputField.parentElement.insertBefore(
          warningElement,
          inputField.nextSibling
        );
      }
      warningShown = true;
    };

    const handleSubmit = () => {
      const value = inputField.value.trim();
      if (value && value.length === 4 && /^\d{4}$/.test(value)) {
        modal.remove();
        resolve(value);
      } else if (!value && warningShown) {
        // User pressed enter again with no value after warning
        modal.remove();
        resolve("");
      } else if (!value) {
        // First time submitting without value - show warning
        showWarning();
        inputField.style.borderColor = "#e85e6a";
        inputField.focus();
      } else {
        // Invalid input (not 4 digits)
        inputField.style.borderColor = "#e85e6a";
        inputField.focus();
      }
    };

    const handleCancel = () => {
      modal.remove();
      resolve(null);
    };

    submitButton.addEventListener("click", handleSubmit);
    cancelButton.addEventListener("click", handleCancel);

    inputField.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleSubmit();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    });

    // Only allow numeric input
    inputField.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, "");
      if (e.target.value.length <= 4) {
        e.target.style.borderColor = backgroundColor;
      }
    });

    document.body.appendChild(modal);
    inputField.focus();
  });
};

/**
 * Styles for the mini modal
 */
const miniModalStyles = {
  background: "linear-gradient(135deg, #b7f8db 0%, #50e3c2 100%)",
  padding: "20px",
  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
  borderRadius: "8px",
  color: "#333",
  transition: "opacity 0.3s ease-in-out",
  opacity: "1",
};

/**
 * Creates a modal message element
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether this is an error message
 * @returns {HTMLElement} The modal message element
 */
const createModalMessage = (message, isError = false) => {
  const modal = document.createElement("div");
  modal.className = "mini-modal-message";
  modal.innerHTML = `
    <div class="mini-modal-content">
      <p>${message}</p>
    </div>
  `;
  Object.assign(modal.style, miniModalStyles);
  if (isError) {
    modal.style.background =
      "linear-gradient(135deg, #ffcccc 0%, #ff9999 100%)";
    modal.style.color = "#010101";
  }
  return modal;
};

/**
 * Displays a mini-modal with a message that auto-dismisses
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether this is an error message (red styling)
 * @param {number} timeout - How long to display the message in milliseconds
 */
export const createMiniModal = (message, isError = false, timeout = 2000) => {
  const modalMessage = createModalMessage(message, isError);

  let existingModal = document.querySelector(".mini-modal");
  // If the modal already exists, append the new message
  if (existingModal) {
    // Confirm that the existing modal is not a duplicate of the new message
    const existingMessage = existingModal.querySelector(".mini-modal-message");
    if (
      existingMessage &&
      existingMessage.innerHTML === modalMessage.innerHTML
    ) {
      console.log("Duplicate message, not appending again.");
      return; // Exit if the message is a duplicate
    }
    existingModal.appendChild(modalMessage);
    setTimeout(() => {
      modalMessage.remove();
      // If no more messages are left, remove the existing modal
      if (!existingModal.querySelector(".mini-modal-message")) {
        existingModal.remove();
      }
    }, timeout);
  } else {
    // If the modal doesn't exist, create it
    const miniModal = document.createElement("div");
    miniModal.className = "mini-modal";
    miniModal.appendChild(modalMessage);
    miniModal.style.position = "fixed";
    miniModal.style.top = "5%";
    miniModal.style.right = "0%";
    miniModal.style.zIndex = "9999";
    document.body.appendChild(miniModal);
    setTimeout(() => {
      modalMessage.remove();
      // If no more messages are left, remove the mini modal
      if (!miniModal.querySelector(".mini-modal-message")) {
        miniModal.remove();
      }
    }, timeout);
  }
};

/**
 * Displays a tooltip with a cactus cowboy.
 * @param {string} message - The message to display in the tooltip.
 * @param {string} [header="Be a keyboard cowboy!"] - The header text for the tooltip.
 */
export const keyboardCowboy = (message, header = "Be a keyboard cowboy!") => {
  const existing = document.getElementById("keyboard-cowboy-tooltip");
  const cactusCowboy = chrome.runtime.getURL("images/cowboy.png");
  if (existing) existing.remove();

  const tooltip = document.createElement("div");
  tooltip.id = "keyboard-cowboy-tooltip";

  tooltip.innerHTML = `
    <header><h2>${header}</h2></header>
    <main style="display: flex; flex-direction: row;">
        <img src="${cactusCowboy}" style="height:100px;width:100px;margin-right:10px;">
      <p style="color:#000; margin:0;">${message}</p>
    </main>
  `;

  Object.assign(tooltip.style, {
    margin: "35px 1rem 0 auto",
    padding: "1rem",
    textAlign: "center",
    width: "300px",
    backgroundColor: "#fff3cd",
    border: "1px solid #e9ecef",
    borderRadius: "0.25rem",
    zIndex: "1000",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  });

  document.body.appendChild(tooltip);
  console.log(
    "Tooltip inserted into body, in DOM:",
    document.contains(tooltip),
  );
};
