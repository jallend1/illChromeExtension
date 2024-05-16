// Things to integrate with the extension
// DONE 1. Copy the WorldShare address to clipboard (WorldShare)
// *2. Copy the request information to clipboard (WorldShare - No context...Toggle? Keyboard CTRL-SHIFT-I?)
// *3. Paste the request information (Evergreen - Contextual with URL staff/cat/ill/track?)
// DONE *4. Generate an overdue letter (Evergreen - Contextual with URL staff/circ/patron/*?)
// DONE  4a. Isolate overdueNotice function into own file
// *5. Generate an invoice for external partners (Evergreen - Contextual with patron type or name?)

chrome.commands.onCommand.addListener((command) => {
    if(command === 'generate_overdue') {
        chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ['./scripts/overdueNotice.js']
            });
        });
    } else if(command === 'copyFromOCLC') {
        chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ['./scripts/copyFromOCLC.js']
            });
        });
    }
  });

chrome.action.onClicked.addListener(async (tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['./scripts/copyWorldShareAddress.js']
    });
});