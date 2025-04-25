export const applyStyles = (element, styles) => {
    for (const property in styles) {
      element.style[property] = styles[property];
    }
  };

