/**
 * Displays a status modal with a heading, message, background color, and image.
 * @param {string} heading - The heading text for the modal.
 * @param {string} message - The message text for the modal.
 * @param {string} backgroundColor - The background color for the modal.
 * @param {string} imgURL - The image URL to display in the modal.
 */
export const statusModal = (heading, message, backgroundColor, imgURL) => {
  const existingModal = document.getElementById("powILL-modal");
  if (existingModal) {
    existingModal.remove();
  }
  const modal = document.createElement("div");
  modal.setAttribute("id", "powILL-modal");

  Object.assign(modal.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    borderRadius: "1rem",
    zIndex: "1000",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "#000",
    fontSize: "4rem",
    border: "1px solid #000",
    boxShadow: "0 0 10px 5px #000",
  });

  modal.innerHTML = `
  <div>  
    <div style="background-color: ${backgroundColor}; padding: 1rem; border-radius: 1rem 1rem 0 0; text-align: center;">
      <img src=${imgURL} style="width: 100px; height: 100px; border-radius: 50%;">
    </div>
    <div style="background-color: #f9f9f9; text-align: center; border-radius: 0 0 1rem 1rem; padding: 1rem;">
      <header style="font-size: 2rem; font-weight: bold; color: #3b607c;">
        <h2 style="font-weight: thin; padding: 1rem; color: #3b607c">${heading}</h2>
      </header>
      <p style="font-size: 1rem; color: #3b607c;">${message}</p>
      <button id="close-button" style="margin-top: 1rem; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; background-color: ${backgroundColor}; color: #fff; font-size: 1.5rem; cursor: pointer;">
        Close
      </button>
    </div>
  </div>
`;

  const closeButton = modal.querySelector("#close-button");
  closeButton.addEventListener("click", () => {
    modal.remove();
  });

  document.body.appendChild(modal);
  setTimeout(() => {
    modal.remove();
  }, 3000);
};
