// Things to integrate with the extension
// DONE 1. Copy the WorldShare address to clipboard (WorldShare)
// *2. Copy the request information to clipboard (WorldShare - No context...Toggle? Keyboard CTRL-SHIFT-I?)
// *3. Paste the request information (Evergreen - Contextual with URL staff/cat/ill/track?)
// *4. Generate an overdue letter (Evergreen - Contextual with URL staff/circ/patron/*?)

chrome.action.onClicked.addListener(async (tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['./scripts/copyWorldShareAddress.js']
    });
});
