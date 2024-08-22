const collapseToggle = document.querySelectorAll("img.collapsible");
const illActions = document.querySelectorAll(".ill-actions");
const logoLeft = document.querySelector("#logo-left");
const logoRight = document.querySelector("#logo-right");
const modeToggle = document.querySelector("#mode");
const moreInfoButtons = document.querySelectorAll(".more-info");
const aboutButton = document.querySelector("#about");
const lendingMode = document.querySelector("#lending-mode");

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
      // Sends message to background.js to run the script
      chrome.runtime.sendMessage(
        { command: scriptName, data: scriptName },
        async (response) => {
          // Extract address from storage if the script is copyWorldShareAddress to get around clipboard copying restrictions
          if (scriptName === "copyWorldShareAddress") {
            await navigator.clipboard.writeText("");
            await extractFromStorage("addressString");
          } else if (scriptName === "overdueNotice") {
            await navigator.clipboard.writeText("");
            await extractFromStorage("overdueNotice");
          }
        }
      );
    }
  });
};

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

const showModal = (title, content, isError = false) => {
  const modal = document.createElement("div");
  modal.setAttribute("id", "modal");
  modal.setAttribute(
    "style",
    `
    color: ${isError ? "#fff" : "#000"};
    border: 1px solid ${isError ? "#f00" : "#000"};
    box-shadow: 0 0 10px 5px ${isError ? "#f00" : "#000"};
    background-color: ${isError ? "#f00" : "#f9f9f9"};
  `
  );

  const modalTitle = document.createElement("h2");
  modalTitle.textContent = title;
  modal.appendChild(modalTitle);

  const modalContent = document.createElement("div");
  modalContent.innerHTML = content;
  modal.appendChild(modalContent);

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.addEventListener("click", () => {
    document.body.removeChild(modal);
  });
  modal.appendChild(closeButton);

  document.body.appendChild(modal);
};

const moreInfoModal = (buttonId) => {
  const data = moreInfoModalData(buttonId);
  showModal("More Information", data);
};

const errorModal = (errorMessage) => {
  showModal("Error", errorMessage, true);
};

const addEventListeners = () => {
  illActions.forEach((button) => {
    button.addEventListener("click", (event) => {
      const buttonId = event.target.id;
      initiateScript(buttonId);
    });
  });

  logoLeft.addEventListener("click", () => {
    logoLeft.classList.toggle("logo-left-animation");
  });

  logoRight.addEventListener("click", () => {
    logoRight.classList.toggle("logo-right-animation");
  });

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
    const isVibrantMode = modeToggle.textContent === "Vibrant Mode";
    body.classList.toggle("fun-mode", isVibrantMode);
    body.classList.toggle("dreary-mode", !isVibrantMode);
    modeToggle.textContent = isVibrantMode ? "Evergreen Mode" : "Vibrant Mode";
  });

  moreInfoButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const buttonId = event.target.id;
      moreInfoModal(buttonId);
    });
  });

  aboutButton.addEventListener("click", () => {
    showModal(
      "About",
      `
      <h2>Jason's ILL Extension</h2>
      <p>Version: 2.2</p>
      <p>Author: Jason Allen </p>
      <p>An assortment of tools to soften some of those rough edges in the ILL process.</p>
      `
    );
  });

  lendingMode.addEventListener("click", () => {
    initiateScript("frequentLending");
  });
};

addEventListeners();
