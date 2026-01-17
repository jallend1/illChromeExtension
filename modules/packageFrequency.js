const { waitForElementWithInterval, ignoreHiddenElements } =
  await import(chrome.runtime.getURL("modules/utils.js"));
const { createMiniModal } = await import(
  chrome.runtime.getURL("modules/modal.js")
);

const { borrowingAddressSelectors } = await import(
  chrome.runtime.getURL("modules/constants.js")
);

const extractElements = async (selectors) => {
  const elements = {};
  for (const key in selectors) {
    const element = await waitForElementWithInterval(() =>
      ignoreHiddenElements(selectors[key])
    );
    if (element) {
      elements[key] = element.value || element.textContent.trim();
    }
  }
  return elements;
};

const returnArrayOfMatches = async (zipCode) => {
  return new Promise((resolve, reject) => {
    // Check if chrome APIs are available
    if (typeof chrome === "undefined" || !chrome.storage) {
      console.error("Chrome storage API is not available");
      reject(new Error("Chrome storage API is not available"));
      return;
    }

    chrome.storage.local.get("mailData", (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error accessing storage:", chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        const mailData = result.mailData || [];
        if (!zipCode || typeof zipCode !== "string" || zipCode.trim() === "") {
          console.warn(
            "Invalid or missing zipCode in returnArrayOfMatches:",
            zipCode
          );
          resolve([]);
          return;
        }
        if (mailData.length === 0) {
          console.warn("No mail data found in storage.");
          resolve([]);
          return;
        }
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
  let matchingZipCodes = await returnArrayOfMatches(sanitizedPostalCode);
  // If no results are found and it's a full 9-digit ZIP code, try the first 5 digits
  if (matchingZipCodes?.length === 0 && sanitizedPostalCode.length > 5) {
    const firstFiveDigits = sanitizedPostalCode.slice(0, 5);
    matchingZipCodes = await returnArrayOfMatches(firstFiveDigits);
  }
  return matchingZipCodes;
};

const calculateAverageDays = (appearances) => {
  if (appearances <= 0) {
    return 0;
  }
  const averageDays = 365 / appearances;
  return Math.round(averageDays * 100) / 100; // Round to two decimal places
};

/**
 * Checks for known address discrepancies between OCLC data and mailroom data. (Just Pollak Library for now)
 * @param {Object} elements - The extracted address elements from the borrowing form
 * @param {string} elements.postal - The ZIP code from the library
 * @param {string} elements.attention - The attention line containing the library name
 * @returns {string} The corrected ZIP code if a known mismatch exists, otherwise the original postal code
 */
const isAddressMismatch = (elements) => {
  // Sometimes the mailroom has a different ZIP code for libraries than what the libraries say
  if (elements.postal === "92831" && elements.attention.includes("Pollak")) {
    const pollackZipCode = "92834-4150";
    return pollackZipCode;
  }
  return elements.postal;
};

export const packageFrequency = async () => {
  // Noticed intermittent error in console after the fact...Hopefully this will highlight when it's occurring
  if (typeof chrome === "undefined" || !chrome.storage) {
    console.error(
      "Chrome APIs are not available. This function must run in a Chrome extension context."
    );
    createMiniModal(
      "Error: Chrome extension APIs are not available.",
      true,
      10000
    );
    return;
  }

  const elements = await extractElements(borrowingAddressSelectors);
  // Check if known discrepancy between OCLC data and mailroom data
  const zipCodeToCheck = isAddressMismatch(elements);
  let matchingZipCodes = await searchForZipCode(zipCodeToCheck);
  if (!matchingZipCodes) {
    createMiniModal(
      `No ZIP codes matching ${zipCodeToCheck} found.`,
      false,
      10000
    );
    return;
  }
  if (matchingZipCodes.length === 0) {
    createMiniModal(
      `No ZIP codes matching ${zipCodeToCheck} found.`,
      false,
      10000
    );
    return;
  }

  if (matchingZipCodes.length === 1) {
    const appearances = parseInt(matchingZipCodes[0]["Appearances"] || 0, 10);
    const libraryName =
      matchingZipCodes[0]["Recipient Company"] +
      "\n" +
      matchingZipCodes[0]["Recipient Name"];
    const averageDays = Math.floor(calculateAverageDays(appearances));
    createMiniModal(
      `A package was sent to <strong>${libraryName}</strong> every ${averageDays} days in 2024.`,
      false,
      10000
    );
  } else {
    // Multiple matches: list names and appearances
    const list = matchingZipCodes
      .map(
        (library) =>
          `<li><strong>${library["Recipient Company"] || ""}</strong> (${
            library["Recipient Name"] || ""
          }): ${calculateAverageDays(
            library["Appearances"]
          )} days between packages.</li>`
      )
      .join("");
    createMiniModal(
      `<div>Multiple matches for this ZIP code:<ul>${list}</ul></div>`,
      false,
      10000
    );
  }
};
