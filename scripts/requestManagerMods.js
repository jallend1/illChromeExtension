(async () => {
  console.log("Request Manager Mods script starting...");
  if (!window.requestManagerModsInjected) {
    const { waitForElementWithInterval } = await import(
      chrome.runtime.getURL("modules/utils.js")
    );
    window.requestManagerModsInjected = true;
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    let modalObserver = null;
    let removalObserver = null;

    function watchForModal() {
      modalObserver = new MutationObserver((mutationsList, observer) => {
        const modal = document.querySelector(".modal-dialog.modal-xl");
        if (modal) {
          console.log("We got one!", modal);

          observer.disconnect();
          watchForModalRemoval(modal);
        }
      });
      modalObserver.observe(targetNode, config);
    }

    function watchForModalRemoval(modal) {
      removalObserver = new MutationObserver((mutationsList, observer) => {
        if (!document.body.contains(modal)) {
          console.log("Modal closed");
          observer.disconnect();
          watchForModal(); // Start watching for the next modal
        }
      });
      removalObserver.observe(targetNode, config);
    }

    watchForModal();
  }
})();
