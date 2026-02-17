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

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #powill-price-modal .powill-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
      }
      #powill-price-modal .powill-modal-content {
        background: white;
        border-radius: 8px;
        width: 90%;
        max-width: 800px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      #powill-price-modal .powill-modal-header {
        padding: 20px;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      #powill-price-modal .powill-modal-header h2 {
        margin: 0;
        font-size: 20px;
        color: #333;
      }
      #powill-price-modal .powill-modal-close {
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #powill-price-modal .powill-modal-close:hover {
        color: #333;
      }
      #powill-price-modal .powill-modal-body {
        padding: 20px;
        overflow-y: auto;
      }
      #powill-price-modal .powill-modal-controls {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
      }
      #powill-price-modal .powill-modal-controls button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        background: #007bff;
        color: white;
      }
      #powill-price-modal .powill-modal-controls button:hover {
        background: #0056b3;
      }
      #powill-price-modal .powill-result-item {
        padding: 12px;
        margin: 8px 0;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }
      #powill-price-modal .powill-result-found {
        background-color: #d4edda;
        border-color: #c3e6cb;
      }
      #powill-price-modal .powill-result-not-found {
        background-color: #f8d7da;
        border-color: #f5c6cb;
      }
      #powill-price-modal .powill-result-item strong {
        display: block;
        margin-bottom: 4px;
      }
      #powill-price-modal .powill-result-item a {
        color: #007bff;
        text-decoration: none;
      }
      #powill-price-modal .powill-result-item a:hover {
        text-decoration: underline;
      }
    `;

    document.head.appendChild(style);
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

// Listen for messages to show modal
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === 'showPriceResults') {
    const modal = new PriceResultsModal();
    modal.show(message.results);
  }
});
