(async () => {
  const { waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  const grid = await waitForElementWithInterval(".eg-grid");

  if (!grid) {
    console.error("Record summary grid not found");
    return;
  }

  const getHoldableColumnIndex = () => {
    const headers = grid.querySelectorAll(
      '[role="columnheader"]'
    );
    return Array.from(headers).findIndex((header) =>
      header.textContent.trim() === "Holdable?"
    );
  };

  const highlightNonHoldableRows = () => {
    const holdableIndex = getHoldableColumnIndex();
    if (holdableIndex === -1) return;

    const rows = grid.querySelectorAll(
      ".eg-grid-body-row"
    );

    rows.forEach((row) => {
      const cells = row.querySelectorAll('[role="gridcell"]');
      const holdableCell = cells[holdableIndex];
      if (!holdableCell) return;

      if (holdableCell.textContent.trim() === "No") {
        row.style.backgroundColor = "#ffd6d6";
      } else {
        row.style.backgroundColor = "";
      }
    });
  };

  const observer = new MutationObserver(highlightNonHoldableRows);

  observer.observe(grid, {
    childList: true,
    subtree: true,
  });

  highlightNonHoldableRows();
})();
