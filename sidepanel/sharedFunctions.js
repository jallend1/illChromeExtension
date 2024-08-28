const retrieveExtensionVersion = () => {
  const manifestData = chrome.runtime.getManifest();
  const version = document.querySelector("#version");
  version.textContent = `v${manifestData.version}`;
};

retrieveExtensionVersion();
