// Things to integrate with the extension
// DONE 1. Copy the WorldShare address to clipboard (WorldShare)
// DONE 2. Copy the request information to clipboard (WorldShare - No context...Toggle? Keyboard CTRL-SHIFT-I?)
// DONE *3. Paste the request information (Evergreen - Contextual with URL staff/cat/ill/track?)
// DONE 4. Generate an overdue letter (Evergreen - Contextual with URL staff/circ/patron/*?)
// DONE 4a. Isolate overdueNotice function into own file
// *5. Generate an invoice for external partners (Evergreen - Contextual with patron type or name?)
// *6. Automatically switch tabs from request screen to Evergreen tab and auto-fill?
// DONE *7 Add an HTML file detailing all the shortcuts
// DONE *8 Add a context menu for right-clicking on page and revealing custom options?
// DONE *9 Move copy from WorldShare into command palette for consistency?
// * 10 Move state abbreviation conversion into its own file because it's now being used by multiple sources

const currentOptions = [
  { id: "copyWorldShareAddress", title: "Copy Address from WorldShare" },
  { id: "copyFromOCLC", title: "Copy Request Data from WorldShare" },
  { id: "pasteToEvergreen", title: "Paste Request Data into Evergreen" },
  { id: "overdueNotice", title: "Generate Overdue Notice" },
];

// TODO No longer working by default in latest version of Chrome -- Requires manual setup once installed?
// Add keyboard shortcuts for each option
chrome.commands.onCommand.addListener((command) => {
  currentOptions.forEach((option) => {
    if (command === option.id) {
      chrome.tabs.query(
        { active: true, currentWindow: true },
        ([activeTab]) => {
          chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: [`./scripts/${option.id}.js`],
          });
        }
      );
    }
  });
});

// Add context menu items for each option
chrome.runtime.onInstalled.addListener(() => {
  currentOptions.forEach((option) => {
    chrome.contextMenus.create({
      id: option.id,
      title: option.title,
      contexts: ["all"],
    });
  });
});

// Add event listener for context menu clicks
chrome.contextMenus.onClicked.addListener((item) => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: [`./scripts/${item.menuItemId}.js`],
    });
  });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
    if (request.data === "copyFromOCLC") {
      let imgURL = chrome.runtime.getURL("images/jason-128.png");
      let code = `
        let script = document.createElement('script');
        script.textContent = 'window.imgURL = "${imgURL}";';
        (document.head || document.documentElement).appendChild(script);
        script.remove();
      `;
      chrome.scripting
        .executeScript({
          target: { tabId: activeTab.id },
          code: code,
        })
        .then(() => {
          chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: [`./scripts/${request.data}.js`],
          });
        });
    } else {
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: [`./scripts/${request.data}.js`],
      });
    }
    if (request.command === "myCommand") {
      console.log(request.data);
      sendResponse({ result: "Success!" });
    }
  });
});
