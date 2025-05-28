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

const miniModalStyles = {
  position: "fixed",
  top: "5%",
  right: "0%",
  zIndex: "9999",
  background: "linear-gradient(135deg, #b7f8db 0%, #50e3c2 100%)",
  padding: "20px",
  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
  borderRadius: "8px",
  color: "#333",
  transition: "opacity 0.3s ease-in-out",
  opacity: "1",
};

// -- Displays a mini-modal saying Open Transit dialog is being dismissed --
export const createMiniModal = (message) => {
  const existingModal = document.querySelector(".mini-modal");
  if (existingModal) {
    existingModal.remove(); // Remove the existing modal
  }
  const miniModal = document.createElement("div");
  miniModal.className = "mini-modal";
  miniModal.innerHTML = `
      <div class="mini-modal-content">
        <p>${message}</p>
      </div>
    `;
  Object.assign(miniModal.style, miniModalStyles);
  document.body.appendChild(miniModal);
  setTimeout(() => {
    miniModal.remove();
  }, 2000);
};
