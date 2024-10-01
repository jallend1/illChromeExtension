function isbnSearch() {
  const isbnField = document.querySelector(".yui-field-isbn");
  const selectedText = isbnField.textContent;
  const url = `https://evgmobile.kcls.org/eg2/en-US/staff/catalog/search?org=1&limit=10&query=${selectedText}%20&fieldClass=keyword&joinOp=&matchOp=contains&dateOp=is&ridx=122`;
  // const url = `https://evgclient.kcls.org/eg2/en-US/staff/catalog/search?org=1&limit=10&query=${selectedText}%20&fieldClass=keyword&joinOp=&matchOp=contains&dateOp=is&ridx=122`;

  console.log("isbnSearch.js", selectedText);
  chrome.runtime.sendMessage(
    { action: "isbnSearch", url: url },
    function (response) {
      console.log(response);
    }
  );
}
isbnSearch();
