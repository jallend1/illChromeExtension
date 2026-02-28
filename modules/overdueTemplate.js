import { org } from "../data/orgConfig.js";

/**
 * Generates the body paragraph of the overdue notice based on the number of overdue titles.
 * @param {string[]} overdueTitles
 * @returns {string}
 */
function generateOverdueText(overdueTitles) {
  if (overdueTitles.length === 0) {
    return `The Interlibrary Loan book "ILLTITLEGOESHERE" is overdue to the library we borrowed it from, and they would like it returned as soon as possible. The King County Library System may be blocked from borrowing from this library system until this item has been returned. We appreciate you returning any overdue interlibrary loan items at your earliest opportunity. This helps ensure that King County Library System will be able to borrow from this library in the future.`;
  } else if (overdueTitles.length === 1) {
    return `The Interlibrary Loan book "${overdueTitles[0]}" is overdue to the library we borrowed it from, and they would like it returned as soon as possible. The King County Library System may be blocked from borrowing from this library system until this item has been returned. We appreciate you returning any overdue interlibrary loan items at your earliest opportunity. This helps ensure that King County Library System will be able to borrow from this library in the future.`;
  } else if (overdueTitles.length === 2) {
    return `The Interlibrary Loan books "${overdueTitles[0]}" and "${overdueTitles[1]}" are overdue to the library we borrowed them from, and they would like them returned as soon as possible. The King County Library System may be blocked from borrowing from this library system until these items have been returned. We appreciate you returning any overdue interlibrary loan items at your earliest opportunity. This helps ensure that King County Library System will be able to borrow from this library in the future.`;
  } else {
    let titleList = "";
    overdueTitles.forEach((title, index) => {
      if (index === overdueTitles.length - 1) {
        titleList += `and "${title}" `;
      } else {
        titleList += `"${title}", `;
      }
    });
    return `The Interlibrary Loan books ${titleList}are overdue to the library we borrowed them from, and they would like them returned as soon as possible. The King County Library System may be blocked from borrowing from this library system until these items have been returned. We appreciate you returning any overdue interlibrary loan items at your earliest opportunity. This helps ensure that King County Library System will be able to borrow from this library in the future.`;
  }
}

/**
 * Generates the full overdue notice letter as plain text.
 * @param {string[]} overdueTitles
 * @returns {string}
 */
export function generateOverdueLetter(overdueTitles) {
  const todaysDate = new Date().toLocaleDateString();
  const overdueText = generateOverdueText(overdueTitles);

  return `${org.name}
${org.department}
${org.address} * ${org.city}, ${org.state} ${org.zip} * ${org.phone}

Date: ${todaysDate}

Dear Patron,

${overdueText}

Unfortunately, we are not able to issue renewals on interlibrary loan books. If you need more time, you are able to submit a new request once your account is cleared of overdue interlibrary loan titles. This lets us get a copy from a different system, and honor the agreements we made with the libraries that share their collections with us. It also helps to avoid any non-refundable processing fees or replacement costs.

Please do not hesitate to reach out to me if you have any questions. And if you have returned this book since the date above? Please accept our sincerest thanks!`;
}
