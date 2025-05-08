export const applyStyles = (element, styles) => {
  for (const property in styles) {
    element.style[property] = styles[property];
  }
};

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
    // }
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
};
