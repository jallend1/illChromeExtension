/**
 * Retrieves the extension version from the manifest and displays it in the UI.
 * @returns {void}
 */
const retrieveExtensionVersion = () => {
  const manifestData = chrome.runtime.getManifest();
  const version = document.querySelector("#version");
  version.textContent = `v${manifestData.version}`;
};

retrieveExtensionVersion();
