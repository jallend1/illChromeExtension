const buttons = document.querySelectorAll("button");

const initiateScript = (scriptName) => {
  // Focus on the tab that the user is currently on
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var currentTab = tabs[0];
    chrome.tabs.update(currentTab.id, { active: true });
    // Displays error message if user is not on a WorldShare page and runs a WorldShare Script
    if (
      !currentTab.url.includes("kingcountylibrarysystem") &&
      scriptName === "copyFromOCLC"
    ) {
      errorModal("This only works from a WorldShare page.");
      return;
    } else {
      chrome.runtime.sendMessage(
        { command: scriptName, data: scriptName },
        function (response) {
          console.log(response);
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
