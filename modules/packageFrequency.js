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

const zipCodeExistsInStorage = async (zipCode) => {
  console.log("Zip Code to check:", zipCode);
  const { mailData } = await chrome.storage.local.get("mailData");
  const matchingZipCodes = mailData.filter((data) => {
    return (
      data["Recipient Address"] && data["Recipient Address"].includes(zipCode)
    );
  });

  if (matchingZipCodes.length === 0) {
    return false;
  }

  // TODO: Additional filtering for multiple libraries inside the same zip code

  const appearances = parseInt(
    matchingZipCodes[0] ? matchingZipCodes[0]["Appearances"] : 0,
    10
  );
  if (appearances > 0) {
    const averageDays = 365 / appearances;
    const roundedAverageDays = Math.round(averageDays * 100) / 100;
    console.log("Average Days:", roundedAverageDays);
    createMiniModal(
      `A package was sent to this ZIP code every ${roundedAverageDays} days in 2024.`
    );
  }

  return mailData.some((data) => {
    return (
      data["Recipient Address"] && data["Recipient Address"].includes(zipCode)
    );
  });
};

export const packageFrequency = () => {
  extractElements(borrowingSelectors)
    .then((elements) => {
      console.log("Extracted Elements:", elements);

      // TODO: Only took first five because active request had text...Maybe take full 9 digits if a hyphen is detected?
      // Only take the first 5 digits of the postal code
      if (elements.postal && elements.postal.length > 5) {
        elements.postal = elements.postal.slice(0, 5);
      }
      zipCodeExistsInStorage(elements.postal)
        .then((exists) => {
          if (exists) {
            console.log(`Zip code ${elements.postal} exists in storage.`);
          } else {
            console.log(
              `Zip code ${elements.postal} does not exist in storage.`
            );
          }
        })
        .catch((error) => {
          console.error("Error checking zip code existence:", error);
        });
    })
    .catch((error) => {
      console.error("Error extracting elements:", error);
    });
};

// Import all this from utils once timeout is removed
const createMiniModal = (message) => {
  console.log("Creating mini modal with message:", message);
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
