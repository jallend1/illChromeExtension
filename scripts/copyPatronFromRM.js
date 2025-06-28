// (async () => {
//   const titleField = document.querySelector(
//     "body > ngb-modal-window > div > div > div.modal-body.form-validated > div:nth-child(2) > div.col-10 > input"
//   );
//   const authorField = document.querySelector(
//     "body > ngb-modal-window > div > div > div.modal-body.form-validated > div:nth-child(4) > div:nth-child(4) > input"
//   );
//   const title = titleField ? titleField.value.trim() : "";
//   const author = authorField ? authorField.value.trim() : "";
//   const clipboardContent = `${title} ${author}`;
//   navigator.clipboard
//     .writeText(clipboardContent)
//     .then(() => {
//       console.log("Title and Author copied to clipboard:", clipboardContent);
//     })
//     .catch((err) => {
//       console.error("Failed to copy Title and Author:", err);
//     });
// })();
