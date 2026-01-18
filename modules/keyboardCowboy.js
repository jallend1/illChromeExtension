/**
 * Displays a tooltip with a cactus cowboy.
 * @param {string} message - The message to display in the tooltip.
 */
export const keyboardCowboy = (message, header = "Be a keyboard cowboy!") => {
  const mainSection = document.querySelector("main");
  const existing = document.getElementById("keyboard-cowboy-tooltip");
  const cactusCowboy = chrome.runtime.getURL("images/cowboy.png");
  if (existing) existing.remove();

  const tooltip = document.createElement("div");
  tooltip.id = "keyboard-cowboy-tooltip";
  Object.assign(tooltip.style, {
    margin: "35px 1rem 0 auto",
    padding: "1rem",
    textAlign: "center",
    width: "300px",
    backgroundColor: "#fff3cd",
    border: "1px solid #e9ecef",
    borderRadius: "0.25rem",
    zIndex: "1000",
  });

  tooltip.innerHTML = `
    <header><h2>${header}</h2></header>
    <main style="display: flex; flex-direction: row;">
        <img src="${cactusCowboy}" style="height:100px;width:100px;margin-right:10px;">
      <p style="color:#000; margin:0;">${message}</p>
    </main>
  `;

  mainSection?.parentElement?.insertBefore(tooltip, mainSection);
};
