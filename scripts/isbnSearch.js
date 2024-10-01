function isbnSearch() {
  const isbnField = document.querySelector(".yui-field-isbn");
  const selectedText = isbnField.textContent;
  const urlSuffix = `search?org=1&limit=10&query=${selectedText}%20&fieldClass=keyword&joinOp=&matchOp=contains&dateOp=is&ridx=122`;
  chrome.runtime.sendMessage({ action: "isbnSearch", url: urlSuffix });
}
isbnSearch();
