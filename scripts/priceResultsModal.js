/**
 * Modal display for bulk price check results
 */

class PriceResultsModal {
  constructor() {
    this.modal = null;
    this.results = [];
  }

  create() {
    // Create modal container
    this.modal = document.createElement('div');
    this.modal.id = 'powill-price-modal';
    this.modal.innerHTML = `
      <div class="powill-modal-overlay">
        <div class="powill-modal-content">
          <div class="powill-modal-header">
            <h2>Bulk Price Check Results</h2>
            <button class="powill-modal-close">&times;</button>
          </div>
          <div class="powill-modal-body">
            <div class="powill-modal-controls">
              <button id="powill-copy-results">Copy to Clipboard</button>
              <button id="powill-clear-results">Clear All</button>
            </div>
            <div id="powill-results-container"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);

    // Setup event listeners
    this.modal.querySelector('.powill-modal-close').addEventListener('click', () => this.hide());
    this.modal.querySelector('.powill-modal-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('powill-modal-overlay')) {
        this.hide();
      }
    });
    this.modal.querySelector('#powill-copy-results').addEventListener('click', () => this.copyResults());
    this.modal.querySelector('#powill-clear-results').addEventListener('click', () => this.clearResults());
  }

  show(results) {
    if (!this.modal) {
      this.create();
    }
    this.results = results;
    this.renderResults();
    this.modal.style.display = 'block';
  }

  hide() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }

  renderResults() {
    const container = this.modal.querySelector('#powill-results-container');
    container.innerHTML = '';

    this.results.forEach(result => {
      const resultDiv = document.createElement('div');
      resultDiv.className = `powill-result-item ${result.found ? 'powill-result-found' : 'powill-result-not-found'}`;

      if (result.found) {
        const isbnDisplay = result.isbn ? `<br/>ISBN: ${result.isbn}` : '';
        resultDiv.innerHTML = `
          <strong>Search: ${result.searchTerm}</strong>${isbnDisplay}<br/>
          Price: ${result.price}<br/>
          <a href="${result.url}" target="_blank">View Product</a>
        `;
      } else {
        resultDiv.innerHTML = `
          <strong>Search: ${result.searchTerm}</strong><br/>
          Not found${result.error ? ': ' + result.error : ''}
        `;
      }

      container.appendChild(resultDiv);
    });
  }

  copyResults() {
    // Build HTML table for Excel (preserves unique hyperlinks)
    const htmlRows = this.results.map((r) => {
      const isbn13 = r.isbn && r.isbn.startsWith("97") ? r.isbn : "";
      const source = r.found ? "Kinokuniya" : "";
      const link = r.found && r.url ? `<a href="${r.url}">Link</a>` : "";
      return `<tr><td>${isbn13}</td><td>${r.searchTerm}</td><td>${r.price}</td><td>${source}</td><td></td><td>${link}</td></tr>`;
    });
    const html = `<table>${htmlRows.join("")}</table>`;

    // Build plain text fallback (tab-separated with raw URLs)
    const textLines = this.results.map((r) => {
      const isbn13 = r.isbn && r.isbn.startsWith("97") ? r.isbn : "";
      const source = r.found ? "Kinokuniya" : "";
      const link = r.found && r.url ? r.url : "";
      return `${isbn13}\t${r.searchTerm}\t${r.price}\t${source}\t\t${link}`;
    });
    const text = textLines.join("\n");

    const htmlBlob = new Blob([html], { type: "text/html" });
    const textBlob = new Blob([text], { type: "text/plain" });

    navigator.clipboard.write([
      new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": textBlob,
      }),
    ]).then(
      () => {
        alert("Results copied to clipboard! Paste into Excel.");
      },
      (err) => {
        console.error("Failed to copy:", err);
        alert("Failed to copy to clipboard.");
      }
    );
  }

  clearResults() {
    this.results = [];
    this.renderResults();
    this.hide();
    // Notify sidepanel to clear its results
    chrome.runtime.sendMessage({ command: 'clearPriceResults' });
  }
}

// Singleton modal instance - prevents stacking multiple modals
let modalInstance = null;

// Listen for messages to show modal
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === 'showPriceResults') {
    if (!modalInstance) {
      modalInstance = new PriceResultsModal();
    }
    modalInstance.show(message.results);
  }
});
