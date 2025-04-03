(async () => {
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );

  function lendingFeeAlert() {
    const checkILLTitle = (attempts = 0) => {
      return new Promise((resolve, reject) => {
        const attemptCheck = (currentAttempt) => {
          const titleAnchor = document.querySelector(
            "a[href*='/catalog/record/']"
          );
          if (
            titleAnchor &&
            titleAnchor.textContent.startsWith("ILL Title - ")
          ) {
            console.log("Attempts: ", attempts, "ILL Title found");
            resolve(true);
          } else if (titleAnchor) {
            console.log(
              "Attempts",
              attempts,
              "Not an ILL title: ",
              titleAnchor.textContent
            );
            resolve(false);
          } else if (currentAttempt < 15) {
            setTimeout(() => attemptCheck(currentAttempt + 1), 100);
          } else {
            console.log("Title not found after 15 attempts");
            resolve(false);
          }
        };
        attemptCheck(attempts);
      });
    };

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.data === "lendingFeeAlert") {
        console.log(request.lendingFee);
        checkILLTitle()
          .then((isILLTitle) => {
            if (isILLTitle) {
              statusModal(
                `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Fee!</h2> <p style="font-size: 1rem;">This request may have a lending fee of ${request.lendingFee}. If so, don't forget to add it to the patron record.</p>`,
                "#e85e6a",
                chrome.runtime.getURL("images/fee.png")
              );
            }
            sendResponse({ response: "Modal displayed" });
          })
          .catch((error) => {
            console.error(error);
            sendResponse({ response: "Error occurred" });
          });
        return true; // Indicate that the response will be sent asynchronously and prevents console errors
      }
    });
  }

  lendingFeeAlert();

  // TODO: In progress - Verify patron name against WorldShare; Auto-update pickup location to request info
  const extractPatronDataFromStorage = () => {
    chrome.storage.local.get("requestData", (result) => {
      if (!result.requestData) {
        statusModal(
          `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Error!</h2> <p style="font-size: 1rem;">Couldn't find any data to paste. Try copying from WorldShare again. If the error persists, please contact Jason.</p>`,
          "#e85e6a",
          chrome.runtime.getURL("images/kawaii-book-sad.png")
        );
        return;
      } else {
        const { patronName } = JSON.parse(result.requestData);
        console.log(patronName);
        const nameField = patronName.split(", ");
        // Converts name to match Evergreen formatting
        const name =
          nameField[0].toUpperCase() + ", " + nameField[1].toUpperCase();
        const pickupLocation = nameField[2];
        console.log("Name: ", name, "Pickup Location: ", pickupLocation);
      }
    });
  };

  // TODO: Run this function on the Place Hold screen and repeat until the h3 element also includes a name in parentheses
  const compareNames = (patronName) => {
    const h3Elements = document.querySelectorAll("h3");
    const nameElement = Array.from(h3Elements).find((element) =>
      element.textContent.includes("Place Hold")
    );
  };

  extractPatronDataFromStorage();
})();
