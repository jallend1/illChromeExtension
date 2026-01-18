/**
 * Displays a tooltip with a cactus cowboy.
 * @param {string} message - The message to display in the tooltip.
 * @param {string} [header="Be a keyboard cowboy!"] - The header text for the tooltip.
 */
export const keyboardCowboy = (message, header = "Be a keyboard cowboy!") => {
  const existing = document.getElementById("keyboard-cowboy-tooltip");
  const cactusCowboy = chrome.runtime.getURL("images/cowboy.png");
  if (existing) existing.remove();

  const tooltip = document.createElement("div");
  tooltip.id = "keyboard-cowboy-tooltip";

  tooltip.innerHTML = `
    <header><h2>${header}</h2></header>
    <main style="display: flex; flex-direction: row;">
        <img src="${cactusCowboy}" style="height:100px;width:100px;margin-right:10px;">
      <p style="color:#000; margin:0;">${message}</p>
    </main>
  `;

  Object.assign(tooltip.style, {
    margin: "35px 1rem 0 auto",
    padding: "1rem",
    textAlign: "center",
    width: "300px",
    backgroundColor: "#fff3cd",
    border: "1px solid #e9ecef",
    borderRadius: "0.25rem",
    zIndex: "1000",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  });

  document.body.appendChild(tooltip);
  console.log(
    "Tooltip inserted into body, in DOM:",
    document.contains(tooltip),
  );
};
