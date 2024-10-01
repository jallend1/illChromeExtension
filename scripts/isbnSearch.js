function isbnSearch() {
  // WorldShare keeps all requests open, so extracts the latest ISBN field
  const isbnFields = document.querySelectorAll(".yui-field-isbn");
  const latestIsbnField = isbnFields[isbnFields.length - 1];
  const isbnContent = latestIsbnField.textContent;
  const firstISBN = isbnContent.split(" ")[0];

  // Checks previousISBN to prevent duplicate searches
  const previousIsbn = sessionStorage.getItem("isbn");
  // TODO: Maybe make this a bit more expansive? Error modal? Automatic page refresh?
  if (previousIsbn === firstISBN) {
    alert(
      "This ISBN matches the last one we searched. Maybe do a page refresh! Or at least double check."
    );
  }
  sessionStorage.setItem("isbn", firstISBN);
  const urlSuffix = `search?org=1&limit=10&query=${firstISBN}%20&fieldClass=keyword&joinOp=&matchOp=contains&dateOp=is&ridx=122`;
  chrome.runtime.sendMessage({ action: "isbnSearch", url: urlSuffix });
}

isbnSearch();
