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
   * @returns {string} The formatted invoice letter as plain text
   */
  function generateInvoiceLetter(billsData, address) {
    const todaysDate = new Date().toLocaleDateString();

    let itemsTable = "";
    let totalBalance = 0;

    billsData.forEach((item) => {
      const balanceValue = parseFloat(item.balance.replace("$", "")) || 0;
      totalBalance += balanceValue;

      itemsTable += `Title: ${item.title}
Due Date: ${item.dueDate}
Balance: ${item.balance}

`;
    });

    return `King County Library System
Interlibrary Loan
960 Newport Way NW * Issaquah, WA 98027 * 425.369.3490

Date: ${todaysDate}

${address}

The following interlibrary loan item(s) have been declared lost:

${itemsTable}

TOTAL AMOUNT DUE: $${totalBalance.toFixed(2)}

The costs listed above represent replacement costs for these items. Please only pay if you have given up hope that these items will be returned. We always prefer the original item back over payment.

If you have any questions or see any errors, please either respond to this email or reach out to illdept@kcls.org.

King County Library System
Interlibrary Loan Department`;
  }

  /**
   * Generates a styled HTML invoice letter from extracted bills data
   * @param {Array} billsData - Array of objects containing balance, dueDate, and title
   * @param {string} address - Patron's mailing address
   * @returns {string} The formatted invoice letter as HTML
   */
  function generateInvoiceHTML(billsData, address, logoBase64) {
    const todaysDate = new Date().toLocaleDateString();

    function escapeHTML(str) {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    let totalBalance = 0;
    let rowsHTML = "";

    billsData.forEach((item, i) => {
      const balanceValue = parseFloat(item.balance.replace("$", "")) || 0;
      totalBalance += balanceValue;
      const rowBg = i % 2 === 0 ? "#ffffff" : "#EBF3FB";

      rowsHTML += `<tr style="background-color: ${rowBg};">
        <td style="border: 1px solid #BDD7EE; padding: 5pt 8pt;">${escapeHTML(item.title)}</td>
        <td style="border: 1px solid #BDD7EE; padding: 5pt 8pt; text-align: center; white-space: nowrap; width: 80pt;" width="107">${escapeHTML(item.dueDate)}</td>
        <td style="border: 1px solid #BDD7EE; padding: 5pt 8pt; text-align: right; white-space: nowrap; width: 70pt;" width="93">${escapeHTML(item.balance)}</td>
      </tr>`;
    });

    const addressHTML = escapeHTML(address).replace(/\n/g, "<br>");

    return `<!DOCTYPE html><html><body>
<div style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; max-width: 700px;">
  <table style="border: none; border-collapse: collapse; margin-bottom: 16pt;" cellpadding="0" cellspacing="0">
    <tr>
      <td style="border: none; padding: 0 16pt 0 0; vertical-align: middle;">
        <img src="${logoBase64}" style="height: 72pt; width: auto;" alt="King County Library System">
      </td>
      <td style="border: none; padding: 0; vertical-align: middle;">
        <p style="margin: 0 0 2pt 0; font-size: 14pt; font-weight: bold;">King County Library System</p>
        <p style="margin: 0 0 2pt 0;">Interlibrary Loan</p>
        <p style="margin: 0; color: #555555;">960 Newport Way NW &bull; Issaquah, WA 98027 &bull; 425.369.3490</p>
      </td>
    </tr>
  </table>
  <p style="margin: 0 0 16pt 0;">Date: ${todaysDate}</p>
  <p style="margin: 0 0 16pt 0;">${addressHTML}</p>
  <p style="margin: 0 0 16pt 0;">Dear Resource Sharing Partner,</p>
  <p style="margin: 0 0 10pt 0;">The following interlibrary loan item(s) have been declared lost:</p>
  <table style="border-collapse: collapse; width: 100%; margin-bottom: 14pt;" cellpadding="0" cellspacing="0">
    <thead>
      <tr style="background-color: #1F4E79; color: #ffffff;">
        <th style="border: 1px solid #1F4E79; padding: 6pt 8pt; text-align: left;">Title</th>
        <th style="border: 1px solid #1F4E79; padding: 6pt 8pt; text-align: center; white-space: nowrap; width: 80pt;" width="107">Due Date</th>
        <th style="border: 1px solid #1F4E79; padding: 6pt 8pt; text-align: right; white-space: nowrap; width: 70pt;" width="93">Balance</th>
      </tr>
    </thead>
    <tbody>${rowsHTML}</tbody>
  </table>
  <p style="margin: 0 0 16pt 0; font-size: 12pt; font-weight: bold; text-align: right;">TOTAL AMOUNT DUE: $${totalBalance.toFixed(2)}</p>
  <p style="margin: 0 0 16pt 0;">The costs listed above represent replacement costs for these items. Please only pay if you have given up hope that these items will be returned. We always prefer the original item back over payment.</p>
  <p style="margin: 0 0 16pt 0;">If you have any questions or see any errors, please either respond to this email or reach out to <a href="mailto:illdept@kcls.org">illdept@kcls.org</a>.</p>
  <p style="margin: 0 0 24pt 0;">Sincerely,</p>
  <p style="margin: 0;">King County Library System<br>Interlibrary Loan Department</p>
</div>
</body></html>`;
  }

  async function getLogoBase64() {
    const url = chrome.runtime.getURL("images/KCLS.png");
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  const invoiceText = generateInvoiceLetter(extractedData, address);
  const logoBase64 = await getLogoBase64();
  const invoiceHTML = generateInvoiceHTML(extractedData, address, logoBase64);

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

  copyToClipboard(
    { text: invoiceText, html: invoiceHTML },
    extractedData.length,
  );
}

libraryInvoice();
