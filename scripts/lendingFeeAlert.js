function lendingFeeAlert() {
  const statusModal = (data, backgroundColor, imgURL) => {
    const modal = document.createElement("div");
    modal.setAttribute("id", "modal");

    const modalStyles = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      borderRadius: "1rem",
      zIndex: "1000",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      color: "#000",
      border: "1px solid #000",
      boxShadow: "0 0 10px 5px #000",
    };

    Object.entries(modalStyles).forEach(([key, value]) => {
      modal.style[key] = value;
    });

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

// TODO: In progress - Verify patron name against WorldShare; Auto-update pickup location to request info
const extractPatronDataFromStorage = () => {
  chrome.storage.local.get("requestData", (result) => {
    if (!result.requestData) {
      statusModal(
        "Couldn't find any data to paste! Try copying from the WorldShare request again. If the error persists, please contact Jason."
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
