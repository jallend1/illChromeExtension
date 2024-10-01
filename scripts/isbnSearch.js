function isbnSearch() {
  const isbnField = document.querySelector(".yui-field-isbn");
  const isbnContent = isbnField.textContent;
  const firstISBN = isbnContent.split(" ")[0];
  const urlSuffix = `search?org=1&limit=10&query=${firstISBN}%20&fieldClass=keyword&joinOp=&matchOp=contains&dateOp=is&ridx=122`;
  chrome.runtime.sendMessage({ action: "isbnSearch", url: urlSuffix });
}
isbnSearch();
