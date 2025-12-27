const { waitForElementWithInterval } = await import(
  chrome.runtime.getURL("modules/utils.js")
);
const { populatePatronBarcode, getPatronSearchElements } = await import(
  chrome.runtime.getURL("scripts/retrievePatron.js")
);

/**
 * Waits for billing modal to appear and then fills out fee and title
 * @param {string} title - The title of the ILL request.
 * @param {number} fee - The lending fee amount.
 */
const addBillingNotes = async (title, fee) => {
  try {
    const billingModal = await waitForElementWithInterval(() => {
      return document.querySelector(".modal-content");
    });
    if (!billingModal) throw new Error("Billing modal not found.");

    const feeInput = billingModal.querySelector("#amount-input");
    const titleInput = billingModal.querySelector("textarea");

    feeInput.value = fee;
    titleInput.value = `Patron approved lending fee for "ILL Title - ${title}" sent out from ILL today.`;
    const event = new Event("input", { bubbles: true, cancelable: true });
    feeInput.dispatchEvent(event);
    titleInput.dispatchEvent(event);
    const submitButton = billingModal.querySelector(".btn.btn-success");
    submitButton.focus();
  } catch (error) {
    console.error("Billing modal not found:", error.message);
  }
};

/**
 * Waits for billing tab to appear and then clicks on it.
 */
const goToBillingTab = async () => {
  try {
    const billingLink = await waitForElementWithInterval(() => {
      return Array.from(document.querySelectorAll("a")).find((link) =>
        link.textContent.includes("Bills")
      );
    });
    billingLink.click();
  } catch (error) {
    console.error("Billing link not found:", error.message);
  }
};

/**
 * Waits for "Add Billing" button to appear on billing tab page and clicks it
 */
const clickAddBilling = async () => {
  // Waits for button to add billing info to appear on billing tab page
  try {
    const addBillingButton = await waitForElementWithInterval(() => {
      return Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent.includes("Add Billing")
      );
    });
    addBillingButton.click();
  } catch (error) {
    console.error("Add Billing button not found:", error.message);
  }
};

/**
 * Adds a lending fee to the patron's account.
 * @param {Object} requestDetails
 */
export const addLendingFee = async (requestDetails) => {
  const { patronBarcode, title, fee } = requestDetails;
  const { inputField, submitButton } = await getPatronSearchElements();
  populatePatronBarcode(inputField, submitButton, patronBarcode);
  goToBillingTab();
  clickAddBilling();
  addBillingNotes(title, fee);
};
