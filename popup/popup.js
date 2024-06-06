const buttons = document.querySelectorAll("button");
buttons.forEach((button) => {
  button.addEventListener("click", (event) => {
    const buttonId = event.target.id;
    alert(buttonId);
    console.log(buttonId);
  });
});
