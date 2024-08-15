const illActions = document.querySelectorAll(".ill-actions");
const logoLeft = document.querySelector("#logo-left");
const logoRight = document.querySelector("#logo-right");
const modeToggle = document.querySelector("#mode");
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
            // await extractAddressFromStorage();
            await extractFromStorage("addressString");
          } else if (scriptName === "overdueNotice") {
            await navigator.clipboard.writeText("");
            // await extractOverdueFromStorage();
            await extractFromStorage("overdueNotice");
          }
        }
      );
    }
  });
};

illActions.forEach((button) => {
  button.addEventListener("click", (event) => {
    const buttonId = event.target.id;
    initiateScript(buttonId);
  });
});

const extractFromStorage = async (key) => {
  const result = await new Promise((resolve) =>
    chrome.storage.local.get(key, resolve)
  );
  if (result[key]) {
    try {
      await navigator.clipboard.writeText(result[key]);
      chrome.storage.local.remove(key);
    } catch (error) {
      console.error(`Failed to copy ${key} to clipboard`, error);
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
  if (modeToggle.textContent === "Vibrant Mode") {
    body.classList.add("fun-mode");
    body.classList.remove("dreary-mode");
    modeToggle.textContent = "Evergreen Mode";
  } else {
    body.classList.remove("fun-mode");
    body.classList.add("dreary-mode");
    modeToggle.textContent = "Vibrant Mode";
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
    width: 95%;
    font-size: 1rem;
    background-color: #f9f9f9;
  `
  );

  const content = document.createElement("div");
  content.setAttribute(
    "style",
    `
    background-color: #f9f9f9;
    text-align: center;
    border-radius: 0 0 1rem 1rem;
    padding: 1rem;
  `
  );
  content.innerHTML = data;
  modal.appendChild(content);

  const footer = document.createElement("footer");
  footer.setAttribute(
    "style",
    `
    
    padding: 1rem;
    border-radius: 1rem 1rem 0 0;
    text-align: right;
    height: 50px;
    position: relative;
  `
  );
  footer.innerHTML = `
  <button style="font-size: 1rem; background-color: #f44336; color: #fff; border: none; border-radius: 0.25rem; padding: 0.5rem 1rem; cursor: pointer;">Close</button>
  `;
  footer.querySelector("button").addEventListener("click", () => {
    document.getElementById("modal").remove();
  });
  modal.appendChild(footer);

  document.body.appendChild(modal);
};

const moreInfoModalData = (data) => {
  const generateHelpContent = (title, description, steps) => `
    <h2>${title}</h2>
    <section class="steps">
      <p>${description}</p>
      <h3>Steps:</h3>
      <ol class="steps">
        ${steps.map((step) => `<li>${step}</li>`).join("")}
      </ol>
    </section>
`;

  const helpContent = {
    "copy-help": generateHelpContent(
      "Copy from OCLC",
      "This copies all the important WorldShare information from the request so it can be entered into Evergreen.",
      [
        "Go to the requests's page in WorldShare.",
        "Click the 'Copy Request Data from WorldShare' button.",
        "The request data is now saved in your browser! To unleash it, see the 'Paste the Request Data in Evergreen' button details for next steps.",
      ]
    ),
    "paste-help": generateHelpContent(
      "Paste to Evergreen",
      "This pastes all the information that was extracted from the 'Copy Request Data' button into 'Create ILL' screen in Evergreen.",
      [
        "Copy the request data from WorldShare using the 'Copy Request Data from WorldShare' button.",
        "Navigate to the 'Create ILL' screen in Evergreen. (Alt+I)",
        "Click the button and verify the information matches the request.",
      ]
    ),
    "address-help": generateHelpContent(
      "Copy WorldShare Address",
      "The WorldShare address field isn't formatted for easy cut and pasting. This resolves that!",
      [
        "Have the WorldShare request open.",
        "Click the Copy WorldShare Address button.",
        "Navigate to the Dymo program and hit Ctrl+V to paste the address.",
      ]
    ),
    "overdue-help": generateHelpContent(
      "Generate Overdue Letter",
      "Pulls title and due date information from a patron's record and inserts it into a letter.",
      [
        "Open the patron's record to the 'Items Out' screen.",
        "Click the Generate Overdue Letter button.",
        "Navigate to a new email and hit Ctrl+V to paste the letter.",
      ]
    ),
    "update-account-help": generateHelpContent(
      "Update ILL Account Address",
      "Library accounts expire and need updating on the regular. This button takes care of the defaults.",
      [
        "Navigate to the Edit Account screen in Evergreen for the desired account.",
        "Click the Update ILL Account Address button.",
        "Button will automatically fill in an adult birthday, correct patron type, and district of residence.",
      ]
    ),
  };

  return helpContent[data] || "Details not yet available.";
};
