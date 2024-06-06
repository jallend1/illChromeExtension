const buttons = document.querySelectorAll("button");

const initiateScript = (scriptName) => {
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
    alert(buttonId);
    initiateScript(buttonId);
  });
});
