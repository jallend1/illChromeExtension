// Things to integrate with the extension
// DONE 1. Copy the WorldShare address to clipboard (WorldShare)
// DONE 2. Copy the request information to clipboard (WorldShare - No context...Toggle? Keyboard CTRL-SHIFT-I?)
// DONE *3. Paste the request information (Evergreen - Contextual with URL staff/cat/ill/track?)
// DONE 4. Generate an overdue letter (Evergreen - Contextual with URL staff/circ/patron/*?)
// DONE 4a. Isolate overdueNotice function into own file
// *5. Generate an invoice for external partners (Evergreen - Contextual with patron type or name?)
// *6. Automatically switch tabs from request screen to Evergreen tab and auto-fill?
// DONE *7 Add an HTML file detailing all the shortcuts
// *8 Add a context menu for right-clicking on page and revealing custom options?
// *9 Move copy from WorldShare into command palette for consistency?
// * 10 Move state abbreviation conversion into its own file because it's now being used by multiple sources

chrome.commands.onCommand.addListener((command) => {
  // Generates overdue notice for patron if there are ILLs overdue on patron's account
  // Requires having the list of checked out items open on screen
  if (command === "generate_overdue") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ["./scripts/overdueNotice.js"],
      });
    });
  }
  // Copies the request data (Title, patron barcode, lending library address) from the WorldShare request and stores it in the clipboard
  else if (command === "copyFromOCLC") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ["./scripts/copyFromOCLC.js"],
      });
    });
  } else if (command === "copyAddressFromWorldShare") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ["./scripts/copyWorldShareAddress.js"],
      });
    });
  }
  // Parses the copied request data from the copyFromOCLC command and pastes it into the Evergreen ILL request form
  else if (command === "pasteToEvergreen") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ["./scripts/pasteToEvergreen.js"],
      });
    });
  }
});

const currentOptions = [
  { id: "copyWorldShareAddress", title: "Copy Address from WorldShare" },
  { id: "copyFromOCLC", title: "Copy Request Data from WorldShare" },
  { id: "pasteToEvergreen", title: "Paste Request Data into Evergreen" },
  { id: "overdueNotice", title: "Generate Overdue Notice" },
];

chrome.runtime.onInstalled.addListener(() => {
  currentOptions.forEach((option) => {
    chrome.contextMenus.create({
      id: option.id,
      title: option.title,
      contexts: ["all"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((item) => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
    console.log(item);
    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: [`./scripts/${item.menuItemId}.js`],
    });
  });
});
