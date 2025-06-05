const { waitForElementWithInterval } = await import(
  chrome.runtime.getURL("modules/utils.js")
);

const borrowingSelectors = {
  attention: 'input[data="returning.address.attention"]',
  line1: 'input[data="returning.address.line1"]',
  line2: 'input[data="returning.address.line2"]',
  locality: 'input[data="returning.address.locality"]',
  region: 'span[data="returning.address.region"]',
  postal: 'input[data="returning.address.postal"]',
};

const extractElements = async (selectors) => {
  const elements = {};
  for (const key in selectors) {
    const element = await waitForElementWithInterval(selectors[key]);
    if (element) {
      elements[key] = element.value || element.textContent.trim();
    }
  }
  return elements;
};

export const packageFrequency = () => {
  extractElements(borrowingSelectors)
    .then((elements) => {
      console.log("Extracted Elements:", elements);
    })
    .catch((error) => {
      console.error("Error extracting elements:", error);
    });
};
