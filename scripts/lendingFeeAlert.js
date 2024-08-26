function lendingFeeAlert() {
  const statusModal = (data, backgroundColor, imgURL) => {
    const modal = document.createElement("div");
    modal.setAttribute("id", "modal");
    modal.setAttribute(
      "style",
      `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 1rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: #000;
      
      border: 1px solid #000;
      box-shadow: 0 0 10px 5px #000;
    `
    );
    modal.innerHTML = `
    <div>  
    <div style="background-color: ${backgroundColor}; padding: 1rem; border-radius: 1rem 1rem 0 0; text-align: center;">
    <img src=${imgURL} style="width: 100px; height: 100px; border-radius: 50%;">
    </div>
    <div style="background-color: #f9f9f9;  text-align: center; border-radius: 0 0 1rem 1rem; padding: 1rem;">
    <p>${data}<p>
    </div>
    </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => {
      modal.remove();
    }, 4000);
  };

  const checkILLTitle = (attempts = 0) => {
    return new Promise((resolve, reject) => {
      const attemptCheck = (currentAttempt) => {
        const titleAnchor = document.querySelector(
          "a[href*='/catalog/record/']"
        );
        if (titleAnchor && titleAnchor.textContent.startsWith("ILL Title - ")) {
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
            let imgURL = chrome.runtime.getURL("images/fee.png");
            statusModal(
              `<strong>Warning:</strong> This request may have a lending fee of ${request.lendingFee}. If so, don't forget to add it to the patron record.`,
              "#e85e6a",
              imgURL
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
