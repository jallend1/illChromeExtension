function isbnSearch() {
  const isbnField = document.querySelector(".yui-field-isbn");
  const selectedText = isbnField.textContent; // const selectedText = window.getSelection().toString();    const url = `https://evgclient.kcls.org/eg2/en-US/staff/catalog/search?org=1&limit=10&query=${selectedText}%20&fieldClass=keyword&joinOp=&matchOp=contains&dateOp=is&ridx=122`;        // window.open(url, '_blank');

  //   TODO: Sample code for how this should probably work? -- for Background.js

  chrome.tabs.query({ currentWindow: true }, function (tabs) {
    let evgclientTab = null;
    for (let tab of tabs) {
      if (tab.url.includes("evgclient")) {
        evgclientTab = tab;
      }
    }
    if (evgclientTab) {
      chrome.tabs.update(evgclientTab.id, { url: url });
    } else {
      chrome.tabs.create({ url: url });
    }
  });
}
isbnSearch();
