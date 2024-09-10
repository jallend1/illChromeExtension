export const statusModal = (data, backgroundColor, imgURL) => {
  const modal = document.createElement("div");
  modal.setAttribute("id", "modal");
  const modalStyles = {
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
  };

  for (const [key, value] of Object.entries(modalStyles)) {
    modal.style[key] = value;
  }
  modal.innerHTML = `
    <div>  
    <div style="background-color: ${backgroundColor}; padding: 1rem; border-radius: 1rem 1rem 0 0; text-align: center;">
    <img src=${imgURL} style="width: 100px; height: 100px; border-radius: 50%;">
    </div>
    <div style="background-color: #f9f9f9;  text-align: center; border-radius: 0 0 1rem 1rem; padding: 1rem;">
    ${data}
    </div>
    </div>
    `;

  document.body.appendChild(modal);
  setTimeout(() => {
    modal.remove();
  }, 3000);
};
