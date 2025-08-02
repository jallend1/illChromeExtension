export const waitForElementWithInterval = (selectorOrFunction) =>
  new Promise((resolve, reject) => {
    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const element =
        typeof selectorOrFunction === "function"
          ? selectorOrFunction()
          : document.querySelector(selectorOrFunction);
      if (element) {
        clearInterval(intervalId); // Clears interval when element is found
        resolve(element);
      } else if (Date.now() - startTime > 10000) {
        clearInterval(intervalId);
        // Resolves with null cuz we don't need to be throwing errors around willy nilly
        resolve(null);
      }
    }, 100);
  });

export const buttonStyles = {
  background: "linear-gradient(135deg, #f5f7fa 0%, #e2e6ea 100%)",
  color: "#222",
  border: "1px solid #ccc",
  borderRadius: "8px",
  padding: "0.6em 1.2em",
  fontSize: "0.65rem",
  fontWeight: "bold",
  fontFamily: "Arial, sans-serif",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  letterSpacing: "0.03em",
  cursor: "pointer",
  marginTop: "0",
  outline: "none",
  transition: "background 0.2s, transform 0.15s, box-shadow 0.2s",
  transform: "none",
  display: "block",
  margin: "0 0.25rem",
};

export const hoverStyles = {
  ...buttonStyles,
  background: "linear-gradient(135deg, #e2e6ea 0%, #f5f7fa 100%)", // Reverse subtle gradient
  boxShadow: "0 4px 16px rgba(0,0,0,0.13)",
  transform: "translateY(-2px) scale(1.04)",
};

// -- MiniModal --

export const miniModalStyles = {
  background: "linear-gradient(135deg, #b7f8db 0%, #50e3c2 100%)",
  padding: "20px",
  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
  borderRadius: "8px",
  color: "#333",
  transition: "opacity 0.3s ease-in-out",
  opacity: "1",
};

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
      "linear-gradient(135deg, #ffcccc 0%, #ff9999 100%)"; // Red gradient for errors
    modal.style.color = "#010101";
  }
  return modal;
};

// -- Displays a mini-modal saying Open Transit dialog is being dismissed --
export const createMiniModal = (message, isError = false, timeout = 2000) => {
  const modalMessage = createModalMessage(message, isError);

  let existingModal = document.querySelector(".mini-modal");
  // If the modal already exists, append the new message
  if (existingModal) {
    // TODO: Intermittently having duplicates, suggesting some repetitive calls at some point?
    // Confirm that the existing modal is not a duplicate of the new message
    const existingMessage = existingModal.querySelector(".mini-modal-message");
    if (
      existingMessage &&
      existingMessage.innerHTML === modalMessage.innerHTML
    ) {
      console.log("Duplicate message, not appending again.");
      return; // Exit if the message is a duplicate
    }
    // existingModal.remove(); // Remove the existing modal
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
    console.log("Created new mini modal:", miniModal);
    setTimeout(() => {
      modalMessage.remove();
      // If no more messages are left, remove the mini modal
      if (!miniModal.querySelector(".mini-modal-message")) {
        miniModal.remove();
      }
    }, timeout);
  }
};

export const ignoreHiddenElements = (selector) => {
  const elements = document.querySelectorAll(selector);
  for (const el of elements) {
    // Ignore elements inside a hidden container
    if (!el.closest(".yui3-cardpanel-hidden, .yui3-default-hidden")) {
      return el;
    }
  }
  return null;
};
