/* Description: Scrapes the page for any overdue interlibrary loan titles and
copies an overdue notice letter containing the relevant info to the clipboard. */

// TODO: Extract patron contact information from page and add to letter
// TODO: Extract patron email address from page

async function overdueNotice() {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modals.js")
  );
  const { generateOverdueLetter } = await import(
    chrome.runtime.getURL("modules/overdueTemplate.js")
  );
  window.focus();
  const overdueTitles = [];

  // Extracts ILL titles from page that are overdue (.less-intense-alert class applied to overdue titles)
  /**
   * Checks for overdue titles and adds them to the overdueTitles array
   * @return {void}
   */
  const checkForOverdueTitles = () => {
    const lessIntenseAlertDivs = document.querySelectorAll(
      ".less-intense-alert",
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

  /**
   * Checks for lost titles and adds them to the overdueTitles array
   * @return {void}
   */
  const checkForLostTitles = () => {
    const divs = document.querySelectorAll(
      "div.eg-grid-cell.eg-grid-body-cell",
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

  const overdueLetter = generateOverdueLetter(overdueTitles);

  /**
   * Copies the given data to the clipboard and shows a status modal
   * @param {string} data - The data to copy to the clipboard
   * @returns {void}
   */
  async function copyToClipboard(data) {
    try {
      let imgURL = chrome.runtime.getURL("images/kawaii-dinosaur.png");
      let headerColor = "#4CAF50";
      let result = "";
      let resultHeading = "";
      let resultMessage = "";
      chrome.runtime.sendMessage({ type: "overdueNoticeReady", data });
      if (overdueTitles.length === 0) {
        resultHeading = "Heads up!";
        resultMessage = `No overdue interlibrary loan titles were found on this page, so we've put a blank letter template on your clipboard that you can modify.`;
        headerColor = "#e85e6a";
        imgURL = chrome.runtime.getURL("images/kawaii-book-sad.png");
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
