// Checks the borrowing due date and alerts the user if it is more than 14 days away in the hopes of reducing shipping expenses

// TODO: Loading multiple times
// TODO: Use a modal instead of an alert

function checkBorrowingDueDate() {
  let borrowingLibraryField = document.querySelector(".borrowingLibraryExtra");
  //   Confirms that the current page is a borrowing request
  console.log(borrowingLibraryField);
  if (!borrowingLibraryField) {
    // Check for up to 15 seconds for the borrowing request to load
    let attempts = 0;
    console.log(attempts);
    const interval = setInterval(() => {
      if (document.querySelector(".borrowingLibraryExtra")) {
        borrowingLibraryField = document.querySelector(
          ".yui-field-originalDueDate"
        );
        clearInterval(interval);
        checkBorrowingDueDate();
      }
      attempts++;
      if (attempts > 30) {
        console.log("No borrowing request found");
        clearInterval(interval);
      }
    }, 500);
  } else if (borrowingLibraryField.textContent.includes("(NTG)")) {
    const today = new Date();
    const dueDate = document.querySelector(
      ".yui-field-originalDueDate"
    ).textContent;

    const dueDateArray = dueDate.split("/");
    const dueDateObj = new Date(
      dueDateArray[2],
      dueDateArray[0] - 1,
      dueDateArray[1]
    );
    const diffTime = dueDateObj - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 14) {
      alert(
        "This one isn't due for a while, so maybe hold onto it if you're not combining it with lending items."
      );
    }
  }
}

checkBorrowingDueDate();
