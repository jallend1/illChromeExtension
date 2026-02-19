/* Description: Scrapes the page for any lost titles and
copies an overdue notice letter containing the relevant info to the clipboard. */

async function libraryInvoice() {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modals.js")
  );
  const { generateInvoiceLetter, generateInvoiceHTML, getLogoBase64 } =
    await import(chrome.runtime.getURL("modules/invoiceTemplate.js"));
  window.focus();

  function extractPatronInfo() {
    const addressTextarea = document.querySelector("textarea");
    const fullMailingAddress = addressTextarea?.value?.trim();
    return fullMailingAddress || "Address not found";
  }

  function extractBillsData() {
    const results = [];

    // Get all rows with the lost-row class
    const rows = document.querySelectorAll('[role="row"].lost-row');

    rows.forEach((row) => {
      const cells = row.querySelectorAll('[role="gridcell"]');

      // Column indices based on the table structure:
      // Index 2 = Balance Owed
      // Index 8 = Title
      // Index 9 = Due Date
      const balance = cells[2]?.textContent.trim() || "";
      const title = cells[8]?.textContent.trim() || "";
      const dueDate = cells[9]?.textContent.trim() || "";

      results.push({ balance, dueDate, title });
    });

    return results;
  }

  const extractedData = extractBillsData();
  const address = extractPatronInfo();
  const invoiceText = generateInvoiceLetter(extractedData, address);
  const logoBase64 = await getLogoBase64();
  const invoiceHTML = generateInvoiceHTML(extractedData, address, logoBase64);

  /**
   * Stores the invoice and shows a status modal.
   * @param {Object} data - Object containing text and html versions of the invoice
   * @param {number} itemCount - The number of items in the invoice
   */
  async function copyToClipboard(data, itemCount) {
    try {
      let imgURL = chrome.runtime.getURL("images/kawaii-dinosaur.png");
      let headerColor = "#4CAF50";
      let resultHeading = "";
      let resultMessage = "";

      // Stores invoice in local storage for sidepanel to access
      chrome.storage.local.set({ libraryInvoice: data }, () => {
        chrome.runtime.sendMessage({ type: "libraryInvoiceReady" });
      });

      if (itemCount === 0) {
        resultHeading = "Heads up!";
        resultMessage = `No lost interlibrary loan items were found on this page, so we've put a blank invoice template on your clipboard that you can modify.`;
        headerColor = "#e85e6a";
        imgURL = chrome.runtime.getURL("images/kawaii-book-sad.png");
      } else {
        resultHeading = "Success!";
        resultMessage = `An invoice letter was copied to your clipboard for ${itemCount} ${itemCount === 1 ? "item" : "items"}.`;
      }

      statusModal(resultHeading, resultMessage, headerColor, imgURL);
    } catch (err) {
      statusModal(
        "Error!",
        "An error occurred while copying the invoice letter to your clipboard. Please try again.",
        "#e85e6a",
        chrome.runtime.getURL("images/kawaii-book-sad.png")
      );
      console.error(err);
    }
  }

  copyToClipboard({ text: invoiceText, html: invoiceHTML }, extractedData.length);
}

libraryInvoice();
