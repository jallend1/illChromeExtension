const buttons = document.querySelectorAll("button");

const initiateScript = (scriptName) => {
  // Focus on the tab that the user is currently on
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var currentTab = tabs[0];
    chrome.tabs.update(currentTab.id, { highlighted: true });
  });
  chrome.runtime.sendMessage(
    { command: scriptName, data: scriptName },
    function (response) {
      console.log(response);
    }
  );
};

buttons.forEach((button) => {
  button.addEventListener("click", (event) => {
    const buttonId = event.target.id;
    initiateScript(buttonId);
  });
});
