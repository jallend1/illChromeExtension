// TODO: Break out into its own content script if behavior is needed on other pages

console.log("Injecting emphasizeErrors.js");
function emphasizeErrors() {
  console.log("Emphasizing errors");
  const form = document.querySelector("form");
  const placeHoldButton = document.querySelector(
    "button[keydesc='Place Hold(s)']"
  );
  form.addEventListener("submit", checkAndEmphasizeHoldStatus);
  placeHoldButton.addEventListener("click", checkAndEmphasizeHoldStatus);
}

function checkAndEmphasizeHoldStatus() {
  let holdStatus = document.querySelector(".alert.alert-danger");
  if (!holdStatus) {
    let attempts = 0;
    const checkHoldStatus = () => {
      if (attempts < 15) {
        setTimeout(() => {
          holdStatus = document.querySelector(".alert.alert-danger");
          if (!holdStatus) {
            attempts++;
            checkHoldStatus();
          } else {
            const textContent = holdStatus.textContent
              .replaceAll("_", " ")
              .trim()
              .toLowerCase();
            const modifiedText =
              "Error: " +
              textContent.charAt(0).toUpperCase() +
              textContent.slice(1) +
              ". Override required.";

            const holdStatusStyle = {
              backgroundColor: "red",
              color: "white",
              fontSize: "1.15rem",
              textWrap: "wrap",
              textAlign: "center",
              borderRadius: "10px",
            };

            Object.entries(holdStatusStyle).forEach(([key, value]) => {
              holdStatus.style[key] = value;
            });

            holdStatus.textContent = modifiedText;
          }
        }, 100);
      } else {
        console.log("Hold status not updated after 15 seconds");
      }
    };
    checkHoldStatus();
  }
}

setTimeout(emphasizeErrors, 2000);
