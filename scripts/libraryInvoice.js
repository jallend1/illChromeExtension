/* Description: Scrapes the page for any overdue interlibrary loan titles and
copies an overdue notice letter containing the relevant info to the clipboard. */

// TODO: Extract patron contact information from page and add to letter
// TODO: Extract patron email address from page

async function libraryInvoice() {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modals.js")
  );
  window.focus();
  let todaysDate = new Date().toLocaleDateString();
  const overdueTitles = [];
  let overdueText = "";

function extractPatronInfo() {
  const addressTextarea = document.querySelector('textarea');
  const fullMailingAddress = addressTextarea?.value?.trim();
  return fullMailingAddress || "Address not found";
}
 

  function extractBillsData() {
  const results = [];
  
  // Get all rows with the lost-row class
  const rows = document.querySelectorAll('[role="row"].lost-row');
  
  rows.forEach(row => {
    const cells = row.querySelectorAll('[role="gridcell"]');
    
    // Column indices based on the table structure:
    // Index 2 = Balance Owed
    // Index 8 = Title
    // Index 9 = Due Date
    const balance = cells[2]?.textContent.trim() || '';
    const title = cells[8]?.textContent.trim() || '';
    const dueDate = cells[9]?.textContent.trim() || '';
    
    results.push({
      balance,
      dueDate,
      title
    });
  });
  
  return results;
}

// Call the function to get the data
const extractedData = extractBillsData();
const address = extractPatronInfo();
console.log('Extracted Bills Data:', extractedData);
console.log('Patron Address:', address);

/**
 * Generates an invoice letter template from extracted bills data
 * @param {Array} billsData - Array of objects containing balance, dueDate, and title
 * @param {string} address - Patron's mailing address
 * @returns {string} The formatted invoice letter
 */
function generateInvoiceLetter(billsData, address) {
  const todaysDate = new Date().toLocaleDateString();
  
  // Build the items table
  let itemsTable = '';
  let totalBalance = 0;
  
  billsData.forEach(item => {
    const balanceValue = parseFloat(item.balance.replace('$', '')) || 0;
    totalBalance += balanceValue;
    
    itemsTable += `${item.title}
Due Date: ${item.dueDate}
Balance: ${item.balance}

`;
  });
  
  const invoiceLetter = `King County Library System
Interlibrary Loan
960 Newport Way NW * Issaquah, WA 98027 * 425.369.3490

Date: ${todaysDate}

${address}

Dear Patron,

The following interlibrary loan item(s) have been declared lost and require payment:

${itemsTable}TOTAL AMOUNT DUE: $${totalBalance.toFixed(2)}

Payment for lost interlibrary loan materials must be received before additional items can be borrowed. Payment can be made at any King County Library System location or online through your library account.

The costs listed above represent replacement fees charged by the lending library system. These fees are non-refundable processing costs that cover the loss to their collection.

If you have located and returned the item(s) listed above since the date of this notice, please contact the Interlibrary Loan department at 425.369.3490 to verify receipt.

Questions regarding this invoice should be directed to the Interlibrary Loan department.

Sincerely,

King County Library System
Interlibrary Loan Department`;

  return invoiceLetter;
}

const invoiceText = generateInvoiceLetter(extractedData, address);

console.log('Generated Invoice Letter:', invoiceText);

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
  
//   /**
//    * Determines the appropriate overdue notice text based on the number of overdue titles
//    * @returns {string} The overdue notice text
//    */
//   const determineOverdueText = () => {
//     if (overdueTitles.length === 0) {
//       return `The Interlibrary Loan book "ILLTITLEGOESHERE" is overdue to the library we borrowed it from, and they would like it returned as soon as possible. The King County Library System may be blocked from borrowing from this library system until this item has been returned. We appreciate you returning any overdue interlibrary loan items at your earliest opportunity. This helps ensure that King County Library System will be able to borrow from this library in the future.`;
//     } else if (overdueTitles.length === 1) {
//       return `The Interlibrary Loan book "${overdueTitles[0]}" is overdue to the library we borrowed it from, and they would like it returned as soon as possible. The King County Library System may be blocked from borrowing from this library system until this item has been returned. We appreciate you returning any overdue interlibrary loan items at your earliest opportunity. This helps ensure that King County Library System will be able to borrow from this library in the future.`;
//     } else if (overdueTitles.length === 2) {
//       return `The Interlibrary Loan books "${overdueTitles[0]}" and "${overdueTitles[1]}" are overdue to the library we borrowed them from, and they would like them returned as soon as possible. The King County Library System may be blocked from borrowing from this library system until these items have been returned. We appreciate you returning any overdue interlibrary loan items at your earliest opportunity. This helps ensure that King County Library System will be able to borrow from this library in the future.`;
//     } else if (overdueTitles.length > 2) {
//       overdueTitles.forEach((title, index) => {
//         if (index === overdueTitles.length - 1) {
//           overdueText += `and "${title}" `;
//         } else {
//           overdueText += `"${title}", `;
//         }
//       });
//       return `The Interlibrary Loan books ${overdueText}are overdue to the library we borrowed them from, and they would like them returned as soon as possible. The King County Library System may be blocked from borrowing from this library system until these items have been returned. We appreciate you returning any overdue interlibrary loan items at your earliest opportunity. This helps ensure that King County Library System will be able to borrow from this library in the future.`;
//     }
//   };

//   overdueText = determineOverdueText();

//   const overdueLetter = `
// King County Library System
// Interlibrary Loan
// 960 Newport Way NW * Issaquah, WA 98027 * 425.369.3490 

// Date: ${todaysDate}

// Dear Patron,

// ${overdueText}

// Unfortunately, we are not able to issue renewals on interlibrary loan books. If you need more time, you are able to submit a new request once your account is cleared of overdue interlibrary loan titles. This lets us get a copy from a different system, and honor the agreements we made with the libraries that share their collections with us. It also helps to avoid any non-refundable processing fees or replacement costs.

// Please do not hesitate to reach out to me if you have any questions. And if you have returned this book since the date above? Please accept our sincerest thanks!`;

//   /**
//    * Copies the given data to the clipboard and shows a status modal
//    * @param {string} data - The data to copy to the clipboard
//    * @returns {void}
//    */
//   async function copyToClipboard(data) {
//     try {
//       let imgURL = chrome.runtime.getURL("images/kawaii-dinosaur.png");
//       let headerColor = "#4CAF50";
//       let result = "";
//       let resultHeading = "";
//       let resultMessage = "";
//       // Stores overdue notice in local storage for sidepanel to access
//       chrome.storage.local.set({ overdueNotice: data }, () => {
//         chrome.runtime.sendMessage({ type: "overdueNoticeReady" });
//       });
//       if (overdueTitles.length === 0) {
//         resultHeading = "Heads up!";
//         resultMessage = `No overdue interlibrary loan titles were found on this page, so we've put a blank letter template on your clipboard that you can modify.`;
//       } else {
//         resultHeading = "Success!";
//         resultMessage = `An overdue notice letter was copied to your clipboard for ${
//           overdueTitles.length
//         } ${overdueTitles.length === 1 ? "item" : "items"}.`;
//       }
//       statusModal(resultHeading, resultMessage, headerColor, imgURL);
//     } catch (err) {
//       let result = "";
//       let imgURL = chrome.runtime.getURL("images/kawaii-book-sad.png");
//       let headerColor = "#e85e6a";
//       if (err.message.includes("Document is not focused")) {
//         resultHeading = "Error!";
//         resultMessage = "Please click on the page and try again.";
//       } else {
//         resultHeading = "Error!";
//         resultMessage = `An error occurred while copying the overdue notice letter to your clipboard. Please try again.`;
//       }
//       statusModal(resultHeading, resultMessage, headerColor, imgURL);
//       console.error(err);
//     }
//   }

//   copyToClipboard(overdueLetter);
  copyToClipboard(invoiceText, extractedData.length);
}

libraryInvoice();
