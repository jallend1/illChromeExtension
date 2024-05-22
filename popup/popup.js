// We don't have this rocking yet. Aspirational!

console.log("popup.js");
const buttons = document.querySelectorAll("td");
buttons.forEach((button) => {
  button.addEventListener("click", (event) => {
    const buttonId = event.target.id;
    console.log(buttonId);
  });
});
