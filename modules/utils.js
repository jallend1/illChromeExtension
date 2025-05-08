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
