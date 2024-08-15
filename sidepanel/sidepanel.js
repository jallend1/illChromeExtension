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
  const copyHelp = `
  <h2>Copy from OCLC</h2>
  <section class="steps">
  <p>This copies all the important WorldShare information from the request so it can be entered into Evergreen.</p>
  <h3>Steps:</h3>
  <ol class="steps">
    <li>Go to the requests's page in WorldShare.</li>
    <li>Click the 'Copy Request Data from WorldShare' button.</li>
    <li>The request data is now saved in your browser! To unleash it, see the 'Paste the Request Data in Evergreen' button details for next steps.</li>
  </ol>
  </section>
  `;
  const pasteHelp = `  
  <h2>Paste to Evergreen</h2>
  <section class="steps">
  <p>This pastes all the information that was extracted from the 'Copy Request Data' button into 'Create ILL' screen in Evergreen.</p>
  <h3>Steps:</h3>
  <ol>
    <li>Copy the request data from WorldShare using the 'Copy Request Data from WorldShare' button.</li>
    <li>Navigate to the 'Create ILL' screen in Evergreen. (Alt+I)</li>
    <li>Click the button and verify the information matches the request.</li>
  </ol>
  </section>
  `;
  const addressHelp = `
  <h2>Copy WorldShare Address</h2>
  <section class="steps">
  <p>The WorldShare address field isn't formatted for easy cut and pasting. This resolves that!</p>
  <h3>Steps:</h3>
  <ol>
    <li>Have the WorldShare request open.</li>
    <li>Click the Copy WorldShare Address button.</li>
    <li>Navigate to the Dymo program and hit Ctrl+V to paste the address.</li>
  </ol>
  </section>
  `;

  const overdueHelp = `
  <h2>Generate Overdue Letter</h2>
  <section class="steps">
  <p>Pulls title and due date information from a patron's record and inserts it into a letter.</p>
  <h3>Steps:</h3>
  <ol>
    <li>Open the patron's record to the 'Items Out' screen.</li>
    <li>Click the Generate Overdue Letter button.</li>
    <li>Navigate to a new email and hit Ctrl+V to paste the letter.</li>
  </ol>
  </section>
  `;

  const updateHelp = `
  <h2>Update ILL Account Address</h2>
  <section class="steps">
  <p>Library accounts expire and need updating on the regular. This button takes care of the defaults.</p>
  <h3>Steps:</h3>
  <ol>
    <li>Navigate to the Edit Account screen in Evergreen for the desired account.</li>
    <li>Click the Update ILL Account Address button.</li>
    <li>Button will automatically fill in an adult birthday, correct patron type, and district of residence.</li>
  </ol>
  </section>`;

  switch (data) {
    case "copy-help":
      return copyHelp;
    case "address-help":
      return addressHelp;
    case "paste-help":
      return pasteHelp;
    case "overdue-help":
      return overdueHelp;
    case "update-account-help":
      return updateHelp;
    default:
      return "Details not yet available.";
  }
};
