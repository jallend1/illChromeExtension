// Not used presently, but here for testing

const wcclsModal = () => {
  const modal = document.createElement("div");
  modal.setAttribute("id", "wccls-modal");
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
<div style="padding: 1rem; border-radius: 1rem 1rem 0 0; text-align: center;">
</div>
<div style="background-color: #f9f9f9;  text-align: center; border-radius: 0 0 1rem 1rem; padding: 1rem;">
<form>
<input id="wccls-input" type="text" pattern="[0-9]{4}" title="Please enter a 4 digit number" id="wcclsInput" style="padding: 1rem; font-size: 2rem; border-radius: 1rem; border: 1px solid #000;">
<button type="submit" style="padding: 1rem; font-size: 2rem; border-radius: 1rem; border: 1px solid #000;">Submit</button>
</form>
</div>
</div>
`;

  document.body.appendChild(modal);

  const inputField = modal.querySelector("#wccls-input");
  inputField.focus();

  const form = modal.querySelector("form");
};
