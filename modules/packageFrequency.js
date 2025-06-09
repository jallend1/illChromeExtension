const { waitForElementWithInterval, miniModalStyles } = await import(
  chrome.runtime.getURL("modules/utils.js")
);

// TODO: Update selectors to account for multiple open requests
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

const returnArrayOfMatches = async (zipCode) => {
  console.log("Zip Code to check:", zipCode);
  return new Promise((resolve, reject) => {
    chrome.storage.local.get("mailData", (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error accessing storage:", chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        const mailData = result.mailData || [];
        const matchingZipCodes = mailData.filter((data) => {
          return (
            data["Recipient Address"] &&
            data["Recipient Address"].includes(zipCode)
          );
        });
        resolve(matchingZipCodes);
      }
    });
  });
};

const sanitizePostalCode = (postalCode) => {
  if (!postalCode) return null;
  const match = postalCode.match(/^(\d{5})(-\d{4})?$/);
  // Return the match if it exists, otherwise return the first 5 digits
  return match ? match[0] : postalCode.slice(0, 5);
};

const searchForZipCode = async (zipCodeField) => {
  const sanitizedPostalCode = sanitizePostalCode(zipCodeField);
  console.log(sanitizedPostalCode);
  let matchingZipCodes = await returnArrayOfMatches(sanitizedPostalCode);
  return matchingZipCodes;
};

const calculateAverageDays = (appearances) => {
  if (appearances <= 0) {
    return 0;
  }
  const averageDays = 365 / appearances;
  return Math.round(averageDays * 100) / 100; // Round to two decimal places
};

export const packageFrequency = async () => {
  const elements = await extractElements(borrowingSelectors);
  const matchingZipCodes = await searchForZipCode(elements.postal);
  console.log("Matching Zip Codes:", matchingZipCodes);
  // TODO: Add meaningful handling for ZIP codes that return multiple matches
  if (!matchingZipCodes || matchingZipCodes.length === 0) {
    createMiniModal("No matching ZIP codes found.");
    return;
  }
  if (matchingZipCodes && matchingZipCodes.length > 0) {
    const appearances = parseInt(
      matchingZipCodes[0] ? matchingZipCodes[0]["Appearances"] : 0,
      10
    );
    const averageDays = calculateAverageDays(appearances);
    createMiniModal(
      `A package was sent to this ZIP code every ${averageDays} days in 2024.`
    );
  }
};

// Import all this from utils once timeout is removed
const createMiniModal = (message) => {
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
  }, 10000);
};
