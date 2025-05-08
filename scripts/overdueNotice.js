/* Description: Scrapes the page for any overdue interlibrary loan titles and
copies an overdue notice letter containing the relevant info to the clipboard. */

// TODO: Extract patron contact information from page and add to letter
// TODO: Extract patron email address from page

async function overdueNotice() {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );
  window.focus();
  let todaysDate = new Date().toLocaleDateString();
  const overdueTitles = [];
  let overdueText = "";

  // Extracts ILL titles from page that are overdue (.less-intense-alert class applied to overdue titles)
  const checkForOverdueTitles = () => {
    const lessIntenseAlertDivs = document.querySelectorAll(
      ".less-intense-alert"
    );
    lessIntenseAlertDivs.forEach((div) => {
      const anchorTags = div.querySelectorAll("a");
      anchorTags.forEach((anchor) => {
        if (anchor.textContent.startsWith("ILL Title - ")) {
          overdueTitles.push(anchor.textContent);
        }
      });
    });
  };

  const checkForLostTitles = () => {
    const divs = document.querySelectorAll(
      "div.eg-grid-cell.eg-grid-body-cell"
    );
    // If lost status, extracts title from two columns earlier and pushes it to overdueTitles
    divs.forEach((div, index) => {
      if (div.textContent === " Lost ") {
        const bookTitle = divs[index - 2].textContent;
        // If bookTitle starts with "ILL Title - ", push it to overdueTitles
        if (bookTitle.startsWith("ILL Title - ")) {
          overdueTitles.push(bookTitle);
        }
      }
    });
  };

  checkForOverdueTitles();
  checkForLostTitles();

  const determineOverdueText = () => {
    if (overdueTitles.length === 0) {
      return `The Interlibrary Loan book "ILLTITLEGOESHERE" is overdue to the library we borrowed it from, and they would like it returned as soon as possible. The King County Library System may be blocked from borrowing from this library system until this item has been returned. We appreciate you returning any overdue interlibrary loan items at your earliest opportunity. This helps ensure that King County Library System will be able to borrow from this library in the future.`;
    } else if (overdueTitles.length === 1) {
      return `The Interlibrary Loan book "${overdueTitles[0]}" is overdue to the library we borrowed it from, and they would like it returned as soon as possible. The King County Library System may be blocked from borrowing from this library system until this item has been returned. We appreciate you returning any overdue interlibrary loan items at your earliest opportunity. This helps ensure that King County Library System will be able to borrow from this library in the future.`;
    } else if (overdueTitles.length === 2) {
      return `The Interlibrary Loan books "${overdueTitles[0]}" and "${overdueTitles[1]}" are overdue to the library we borrowed them from, and they would like them returned as soon as possible. The King County Library System may be blocked from borrowing from this library system until these items have been returned. We appreciate you returning any overdue interlibrary loan items at your earliest opportunity. This helps ensure that King County Library System will be able to borrow from this library in the future.`;
    } else if (overdueTitles.length > 2) {
      overdueTitles.forEach((title, index) => {
        if (index === overdueTitles.length - 1) {
          overdueText += `and "${title}" `;
        } else {
          overdueText += `"${title}", `;
        }
      });
      return `The Interlibrary Loan books ${overdueText}are overdue to the library we borrowed them from, and they would like them returned as soon as possible. The King County Library System may be blocked from borrowing from this library system until these items have been returned. We appreciate you returning any overdue interlibrary loan items at your earliest opportunity. This helps ensure that King County Library System will be able to borrow from this library in the future.`;
    }
  };

  overdueText = determineOverdueText();

  const overdueLetter = `
King County Library System
Interlibrary Loan
960 Newport Way NW * Issaquah, WA 98027 * 425.369.3490 

Date: ${todaysDate}

Dear Patron,

${overdueText}

Unfortunately, we are not able to issue renewals on interlibrary loan books. If you need more time, you are able to submit a new request once your account is cleared of overdue interlibrary loan titles. This lets us get a copy from a different system, and honor the agreements we made with the libraries that share their collections with us. It also helps to avoid any non-refundable processing fees or replacement costs.

Please do not hesitate to reach out to me if you have any questions. And if you have returned this book since the date above? Please accept our sincerest thanks!`;

  async function copyToClipboard(data) {
    try {
      let imgURL = chrome.runtime.getURL("images/kawaii-dinosaur.png");
      let headerColor = "#4CAF50";
      let result = "";
      let resultHeading = "";
      let resultMessage = "";
      // Stores overdue notice in local storage for sidepanel to access
      chrome.storage.local.set({ overdueNotice: data });
      if (overdueTitles.length === 0) {
        resultHeading = "Heads up!";
        resultMessage = `No overdue interlibrary loan titles were found on this page, so we've put a blank letter template on your clipboard that you can modify.`;
      } else {
        resultHeading = "Success!";
        resultMessage = `An overdue notice letter was copied to your clipboard for ${
          overdueTitles.length
        } ${overdueTitles.length === 1 ? "item" : "items"}.`;
      }
      statusModal(resultHeading, resultMessage, headerColor, imgURL);
    } catch (err) {
      let result = "";
      let imgURL = chrome.runtime.getURL("images/kawaii-book-sad.png");
      let headerColor = "#e85e6a";
      if (err.message.includes("Document is not focused")) {
        resultHeading = "Error!";
        resultMessage = "Please click on the page and try again.";
      } else {
        resultHeading = "Error!";
        resultMessage = `An error occurred while copying the overdue notice letter to your clipboard. Please try again.`;
      }
      statusModal(resultHeading, resultMessage, headerColor, imgURL);
      console.error(err);
    }
  }

  copyToClipboard(overdueLetter);
}

overdueNotice();
