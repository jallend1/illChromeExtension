/* Description: Scrapes the page for any lost titles and
copies an overdue notice letter containing the relevant info to the clipboard. */

async function libraryInvoice() {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modals.js")
  );
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

      results.push({
        balance,
        dueDate,
        title,
      });
    });

    return results;
  }

  // Call the function to get the data
  const extractedData = extractBillsData();
  const address = extractPatronInfo();

  /**
   * Generates an invoice letter template from extracted bills data
   * @param {Array} billsData - Array of objects containing balance, dueDate, and title
   * @param {string} address - Patron's mailing address
   * @returns {string} The formatted invoice letter
   */
  function generateInvoiceLetter(billsData, address) {
    const todaysDate = new Date().toLocaleDateString();

    // Build the items table
    let itemsTable = "";
    let totalBalance = 0;

    billsData.forEach((item) => {
      const balanceValue = parseFloat(item.balance.replace("$", "")) || 0;
      totalBalance += balanceValue;

      itemsTable += `ILL Number: 
${item.title}
Due Date: ${item.dueDate}
Balance: ${item.balance}

`;
    });

    const invoiceLetter = `King County Library System
Interlibrary Loan
960 Newport Way NW * Issaquah, WA 98027 * 425.369.3490

Date: ${todaysDate}

${address}

Dear Resource Sharing Partner,

The following interlibrary loan item(s) have been declared lost:

${itemsTable}TOTAL AMOUNT DUE: $${totalBalance.toFixed(2)}

The costs listed above represent replacement costs for these items. Please only pay if you have given up hope that these items will be returned. We always prefer the original item back over payment.

If you have any questions or see any errors, please either respond to this email or reach out to illdept@kcls.org.

Sincerely,

King County Library System
Interlibrary Loan Department`;

    return invoiceLetter;
  }

  const invoiceText = generateInvoiceLetter(extractedData, address);

  /**
   * Copies the given data to the clipboard and shows a status modal
   * @param {string} data - The data to copy to the clipboard
   * @param {number} itemCount - The number of items in the invoice
   * @returns {void}
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
      let imgURL = chrome.runtime.getURL("images/kawaii-book-sad.png");
      let headerColor = "#e85e6a";
      let resultHeading = "";
      let resultMessage = "";

      resultHeading = "Error!";
      resultMessage = `An error occurred while copying the invoice letter to your clipboard. Please try again.`;

      statusModal(resultHeading, resultMessage, headerColor, imgURL);
      console.error(err);
    }
  }

  copyToClipboard(invoiceText, extractedData.length);
}

libraryInvoice();
