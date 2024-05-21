console.log("popup.js");
const buttons = document.querySelectorAll("td");
buttons.forEach((button) => {
  button.addEventListener("click", (event) => {
    const buttonId = event.target.id;
    console.log(buttonId);
    // chrome.runtime.sendMessage({ command: buttonId });
  });
});
