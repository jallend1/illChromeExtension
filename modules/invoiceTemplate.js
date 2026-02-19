/**
 * Generates an invoice letter as PLAIN text.
 * Backup function if HTML copying has issues
 * @param {Array} billsData - Array of objects containing balance, dueDate, and title
 * @param {string} address - Patron's mailing address
 * @returns {string}
 */
export function generateInvoiceLetter(billsData, address) {
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
960 Newport Way NW * Issaquah, WA 98027 
425.369.3490
illdept@kcls.org

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
 * Generates a styled HTML invoice letter for pasting into Word, Outlook, or Excel.
 * @param {Array} billsData - Array of objects containing balance, dueDate, and title
 * @param {string} address - Patron's mailing address
 * @param {string} logoBase64 - Base64-encoded data URI of the KCLS logo
 * @returns {string}
 */
export function generateInvoiceHTML(billsData, address, logoBase64) {
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
        <td style="border: 1px solid #BDD7EE; padding: 5pt 8pt; width: 80pt;" width="107"></td>
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
        <p style="margin: 0 0 2pt 0; color: #555555;">960 Newport Way NW &bull; Issaquah, WA 98027</p>
        <p style="margin: 0 0 2pt 0; color: #555555;">425.369.3490</p>
        <p style="margin: 0; color: #555555;">illdept@kcls.org</p>
      </td>
    </tr>
  </table>
  <p style="margin: 5pt 0 16pt 0;">Date: ${todaysDate}</p>
  <p style="margin: 0 0 16pt 0;">${addressHTML}</p>
  <p style="margin: 0 0 10pt 0;">The following interlibrary loan item(s) have been declared lost:</p>
  <table style="border-collapse: collapse; width: 100%; margin-bottom: 14pt;" cellpadding="0" cellspacing="0">
    <thead>
      <tr style="background-color: #1F4E79; color: #ffffff;">
        <th style="border: 1px solid #1F4E79; padding: 6pt 8pt; text-align: left;">Title</th>
        <th style="border: 1px solid #1F4E79; padding: 6pt 8pt; text-align: center; white-space: nowrap; width: 80pt;" width="107">Due Date</th>
        <th style="border: 1px solid #1F4E79; padding: 6pt 8pt; text-align: left; white-space: nowrap; width: 80pt;" width="107">ILL</th>
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

/**
 * Fetches the KCLS logo from the extension package and returns it as a base64 data URI,
 * so it can be embedded directly in clipboard HTML for Word/Outlook compatibility.
 * @returns {Promise<string>}
 */
export async function getLogoBase64() {
  const url = chrome.runtime.getURL("images/KCLS.png");
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
