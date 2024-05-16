/* Description: Scrapes the page for any overdue interlibrary loan titles and
copies an overdue notice letter containing the relevant info to the clipboard. */

// TODO: Add logic to handle LOST titles, whose divs do not have an alert class
// TODO: Extract patron contact information from page and add to letter
// TODO: Extract patron email address from page
// TODO: Store content as object to allow pasting into new email form with subject and recipient filled in

window.focus();

let todaysDate = new Date().toLocaleDateString();
const overdueTitles = [];
let overdueText = '';
let letterCOntent = '';

// Extracts ILL titles from page that are overdue (.less-intense-alert class applied to overdue titles)
const lessIntenseAlertDivs = document.querySelectorAll('.less-intense-alert');
lessIntenseAlertDivs.forEach((div) => {
    const anchorTags = div.querySelectorAll('a');
    anchorTags.forEach((anchor) => {
        if(anchor.textContent.startsWith('ILL Title - ')) {
            overdueTitles.push(anchor.textContent);
        }
    });
});

const determineOverdueText = () => {
    if(overdueTitles.length === 0) {
        return  `The Interlibrary Loan book "ILLTITLEGOESHERE" is overdue to the library we borrowed it from, and they would like it returned as soon as possible. The King County Library System may be blocked from borrowing from this library system until this item has been returned. We appreciate you returning any overdue interlibrary loan items at your earliest opportunity. This helps ensure that King County Library System will be able to borrow from this library in the future.`;
    }
    else if(overdueTitles.length === 1) {
        return  `The Interlibrary Loan book "${overdueTitles[0]}" is overdue to the library we borrowed it from, and they would like it returned as soon as possible. The King County Library System may be blocked from borrowing from this library system until this item has been returned. We appreciate you returning any overdue interlibrary loan items at your earliest opportunity. This helps ensure that King County Library System will be able to borrow from this library in the future.`;
    } else if (overdueTitles.length === 2) {
        return `The Interlibrary Loan books "${overdueTitles[0]}" and "${overdueTitles[1]}" are overdue to the library we borrowed them from, and they would like them returned as soon as possible. The King County Library System may be blocked from borrowing from this library system until these items have been returned. We appreciate you returning any overdue interlibrary loan items at your earliest opportunity. This helps ensure that King County Library System will be able to borrow from this library in the future.`;
    }
    else if (overdueTitles.length > 2) {
        overdueTitles.forEach((title, index) => {
            if(index === overdueTitles.length - 1) {
                overdueText += `and "${title}" `;
            } else {
                overdueText += `"${title}", `;
            }
        });
        return `The Interlibrary Loan books ${overdueText}are overdue to the library we borrowed them from, and they would like them returned as soon as possible. The King County Library System may be blocked from borrowing from this library system until these items have been returned. We appreciate you returning any overdue interlibrary loan items at your earliest opportunity. This helps ensure that King County Library System will be able to borrow from this library in the future.`;
    }
};  

overdueText = determineOverdueText();

if(overdueTitles.length === 0) {
    alert('No overdue interlibrary loan titles found. A letter template was copied to your clipboard.');
}

letterContent = `
King County Library System
Interlibrary Loan
960 Newport Way NW * Issaquah, WA 98027 * 425.369.3490 

Date: ${todaysDate}

Dear Patron,

${overdueText}

Unfortunately, we are not able to issue renewals on interlibrary loan books. If you need more time, you are able to submit a new request once your account is cleared of overdue interlibrary loan titles. This lets us get a copy from a different system, and honor the agreements we made with the libraries that share their collections with us. It also helps to avoid any non-refundable processing fees or replacement costs.

Please do not hesitate to reach out to me if you have any questions. And if you have returned this book since the date above? Please accept our sincerest thanks!`;

navigator.clipboard.writeText(letterContent);