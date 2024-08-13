const buttons = document.querySelectorAll("button");
const logoLeft = document.querySelector("#logo-left");
const logoRight = document.querySelector("#logo-right");
const modeToggle = document.querySelector("#mode");
const currentMode = document.querySelector("#current-mode");
const moreInfoButtons = document.querySelectorAll(".more-info");

const initiateScript = (scriptName) => {
  // Focus on the tab that the user is currently on
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var currentTab = tabs[0];
    chrome.tabs.update(currentTab.id, { active: true });
    // Displays error message if user is not on a WorldShare page and runs a WorldShare Script
    if (
      !currentTab.url.includes("kingcountylibrarysystem") &&
      (scriptName === "copyFromOCLC" || scriptName === "copyWorldShareAddress")
    ) {
      errorModal("This only works from a WorldShare page.");
      return;
    }
    // Displays error if running an Evergreen script outside Evergreen
    else if (
      !currentTab.url.includes("kcls.org") &&
      scriptName === "pasteToEvergreen"
    ) {
      errorModal(
        "Please run this from the 'Create New ILL' screen in Evergreen."
      );
      return;
    } else {
      // Send message to background.js to run the script
      chrome.runtime.sendMessage(
        { command: scriptName, data: scriptName },
        async (response) => {
          // Extract address from storage if the script is copyWorldShareAddress to get around clipboard copying restrictions
          if (scriptName === "copyWorldShareAddress") {
            await navigator.clipboard.writeText("");
            await extractAddressFromStorage();
          } else if (scriptName === "overdueNotice") {
            await navigator.clipboard.writeText("");
            await extractOverdueFromStorage();
          }
        }
      );
    }
  });
};

buttons.forEach((button) => {
  button.addEventListener("click", (event) => {
    const buttonId = event.target.id;
    initiateScript(buttonId);
  });
});

// TODO: Obviously combine these two functions into one
const extractAddressFromStorage = async () => {
  const result = await new Promise((resolve) =>
    chrome.storage.local.get("addressString", resolve)
  );
  if (result.addressString) {
    try {
      await navigator.clipboard.writeText(result.addressString);
      chrome.storage.local.remove("addressString");
    } catch (error) {
      console.error("Failed to copy address to clipboard", error);
    }
  }
};

const extractOverdueFromStorage = async () => {
  const result = await new Promise((resolve) =>
    chrome.storage.local.get("overdueNotice", resolve)
  );
  if (result.overdueNotice) {
    try {
      await navigator.clipboard.writeText(result.overdueNotice);
      chrome.storage.local.remove("overdueNotice");
    } catch (error) {
      console.error("Failed to copy overdue notice to clipboard", error);
    }
  }
};

const errorModal = (data) => {
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
    font-size: 4rem;
    border: 1px solid #000;
    box-shadow: 0 0 10px 5px #000;
  `
  );

  modal.innerHTML = `
  <div>  
  <div style="background-color: #f44336; padding: 1rem; border-radius: 1rem 1rem 0 0; text-align: center;">
  <img src=${chrome.runtime.getURL(
    "images/kawaii-book-sad.png"
  )} style="width: 100px; height: 100px; border-radius: 50%;">
  </div>
  <div style="background-color: #f9f9f9;  text-align: center; border-radius: 0 0 1rem 1rem; padding: 1rem;">
  <p style="font-size: 1rem;">${data}</p>
  </div>
  </div>
  `;

  document.body.appendChild(modal);
  setTimeout(() => {
    modal.remove();
  }, 3000);
};

logoLeft.addEventListener("click", () => {
  logoLeft.classList.toggle("logo-left-animation");
});

logoRight.addEventListener("click", () => {
  logoRight.classList.toggle("logo-right-animation");
});

const collapseToggle = document.querySelectorAll("img.collapsible");

collapseToggle.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const mainSection = toggle.parentElement.nextElementSibling;
    if (mainSection.classList.contains("collapsed")) {
      mainSection.classList.remove("hidden");
      requestAnimationFrame(() => {
        mainSection.classList.remove("collapsed");
      });
    } else {
      mainSection.classList.add("collapsed");
      toggle.textContent = "Expand";
      setTimeout(() => {
        mainSection.classList.add("hidden");
      }, 300);
    }
    if (toggle.src.includes("collapse")) {
      toggle.src = chrome.runtime.getURL("images/expand.svg");
    } else {
      toggle.src = chrome.runtime.getURL("images/collapse.svg");
    }
  });
});

modeToggle.addEventListener("click", () => {
  const body = document.querySelector("body");
  if (currentMode.textContent === "Evergreen Dreary") {
    body.classList.remove("fun-mode");
    body.classList.add("dreary-mode");
    currentMode.textContent = "Fun";
  } else {
    body.classList.add("fun-mode");
    body.classList.remove("dreary-mode");
    currentMode.textContent = "Evergreen Dreary";
  }
});

moreInfoButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    const buttonId = event.target.id;
    moreInfoModal(buttonId);
  });
});

const moreInfoModal = (buttonId) => {
  const data = moreInfoModalData(buttonId);
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
  <div style="background-color: #f44336; padding: 1rem; border-radius: 1rem 1rem 0 0; text-align: center;">
  <img src=${chrome.runtime.getURL(
    "images/kawaii-book-happy.png"
  )} style="width: 100px; height: 100px; border-radius: 50%;">
  </div>
  <div style="background-color: #f9f9f9;  text-align: center; border-radius: 0 0 1rem 1rem; padding: 1rem;">
  ${data}
  </div>
  </div>
  `;

  document.body.appendChild(modal);
  setTimeout(() => {
    modal.remove();
  }, 3000);
};

const moreInfoModalData = (data) => {
  const copyHelp = `
  <h2>Copy from OCLC</h2>
  <p>This copies all the important WorldShare information from the request so it can be entered into Evergreen.</p>
  <h3>Steps:</h3>
  <ol>
    <li>Go to the requests's page in WorldShare.</li>
    <li>Click the 'Copy Request Data from WorldShare' button.</li>
    <li>The request data is now saved in your browser! To unleash it, see the 'Paste the Request Data in Evergreen' button details for next steps.</li>
  </ol>
  `;

  switch (data) {
    case "copy-help":
      return copyHelp;
    case "copyWorldShareAddress":
      return copyWorldShareAddressInfo;
    case "paste-help":
      return pasteToEvergreenInfo;
    case "overdue-help":
      return overdueNoticeInfo;
    default:
      return "No information available.";
  }
};
