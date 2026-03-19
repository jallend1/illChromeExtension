(() => {
  // Find the column header containing "EAN" and "Product Code"
  const allHeaders = Array.from(document.querySelectorAll("td.columnHeader"));
  const eanHeader = allHeaders.find((td) => {
    const text = td.textContent.trim();
    return text.includes("EAN") && text.includes("Product Code");
  });

  if (!eanHeader) {
    chrome.runtime.sendMessage({
      type: "ingramISBNsExtracted",
      isbns: [],
      error: "EAN/Product Code column not found on this page.",
    });
    return;
  }

  const eanColIndex = eanHeader.cellIndex;
  const table = eanHeader.closest("table");

  // Data rows have cells with textWhiteBG or textGreenBG class
  const rows = Array.from(table.querySelectorAll("tr")).filter((row) =>
    row.querySelector("td.textWhiteBG, td.textGreenBG")
  );

  const isbns = rows.reduce((acc, row) => {
    const eanCell = row.cells[eanColIndex];
    if (!eanCell) return acc;

    // The 13-digit ISBN is the first text node in the cell
    const firstTextNode = Array.from(eanCell.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
    );
    if (!firstTextNode) return acc;

    const isbn = firstTextNode.textContent.trim();
    if (/^97[89]\d{10}$/.test(isbn)) {
      acc.push(isbn);
    }
    return acc;
  }, []);

  chrome.runtime.sendMessage({ type: "ingramISBNsExtracted", isbns });
})();
