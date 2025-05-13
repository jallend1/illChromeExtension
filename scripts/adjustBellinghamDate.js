(async () => {
  const { waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  // TODO: Combine this with the waitForElementWithInterval function (Uses querySelectorAll instead of querySelector)
  const waitForElements = (selector) =>
    new Promise((resolve, reject) => {
      const startTime = Date.now();
      const intervalId = setInterval(() => {
        const elements = document.querySelectorAll(selector);
        console.log(elements, selector);
        if (elements.length > 0) {
          clearInterval(intervalId); // Clears interval when element is found
          resolve(elements);
        } else if (Date.now() - startTime > 10000) {
          clearInterval(intervalId);
          // Resolves with null cuz we don't need to be throwing errors around willy nilly
          resolve(null);
        }
      }, 100);
      // }
    });

  //   const dropDownButtons = document.querySelectorAll("button.dropdown-toggle");
  const dropDownButtons = await waitForElements("button.dropdown-toggle");
  // Find the button with the text "Date Options"
  const dateOptionsButton = Array.from(dropDownButtons).find((button) =>
    button.textContent.includes("Date Options")
  );
  if (dateOptionsButton) {
    dateOptionsButton.click();
    // const dateOptions = document.querySelectorAll(
    //   "button.dropdown-item > span.pl-2"
    // );
    const dateOptions = await waitForElements(
      "button.dropdown-item > span.pl-2"
    );
    const specificDueDate = Array.from(dateOptions).find((option) =>
      option.textContent.includes("Specific Due Date")
    );
    if (specificDueDate) {
      specificDueDate.click();
      const dateInput = document.querySelector('input[type="date"]');
      const date = new Date();
      date.setDate(date.getDate() + 70);
      const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
      const day = String(date.getDate()).padStart(2, "0");
      const year = date.getFullYear();
      const formattedDate = `${year}-${month}-${day}`;
      dateInput.value = formattedDate;
      const event = new Event("input", {
        bubbles: true,
        cancelable: true,
      });
      dateInput.focus(); // Focus on the input field
      dateInput.value = formattedDate; // Set the value programmatically
      dateInput.dispatchEvent(
        new Event("input", { bubbles: true, cancelable: true })
      ); // Trigger input event
      dateInput.dispatchEvent(
        new Event("change", { bubbles: true, cancelable: true })
      ); // Trigger change event
      dateInput.blur(); // Blur the input field
      dateInput.dispatchEvent(event);
      const barcodeInput = await waitForElementWithInterval("#barcode-input");
      barcodeInput.focus(); // Focus on the input field
      barcodeInput.click();
    }
  }
})();
