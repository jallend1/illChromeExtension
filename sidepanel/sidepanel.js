const collapseToggle = document.querySelectorAll("img.collapsible");
const illActions = document.querySelectorAll(".ill-actions");
const logoLeft = document.querySelector("#logo-left");
const logoRight = document.querySelector("#logo-right");
const isbnSearch = document.querySelector("#isbn-search");

// Toggle Switch Elements
const darkModeToggle = document.querySelector("#dark-mode");
const disableButton = document.querySelector("#disable-extension");
const openCreateILL = document.querySelector("#open-create-ill");
const autoReceiveRequestButton = document.querySelector(
  "#auto-receive-request"
);
const lendingMode = document.querySelector("#lending-tools");
const passiveTools = document.querySelector("#passive-tools");
const printLabel = document.querySelector("#print-label");

const storageKeys = [
  { key: "openCreateILL", element: openCreateILL },
  { key: "autoReceiveRequest", element: autoReceiveRequestButton },
  { key: "lendingMode", element: lendingMode },
  { key: "arePassiveToolsActive", element: passiveTools },
  { key: "darkMode", element: darkModeToggle },
];

const getStorageValue = (key, element) => {
  chrome.storage.local.get(key, (result) => {
    element.checked = result[key];
  });
};

storageKeys.forEach((storageKey) => {
  getStorageValue(storageKey.key, storageKey.element);
});

const initiateScript = (scriptName) => {
  // Focus on the tab that the user is currently on
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var currentTab = tabs[0];
    chrome.tabs.update(currentTab.id, { active: true });
    chrome.runtime.sendMessage(
      { command: scriptName, data: scriptName },
      async (response) => {
        // Extract address from storage if the script is copyWorldShareAddress to get around clipboard copying restrictions
        if (scriptName === "copyWorldShareAddress") {
          await navigator.clipboard.writeText("");
          await extractFromStorage("addressString");
        } else if (scriptName === "overdueNotice") {
          await navigator.clipboard.writeText("");
          await extractFromStorage("overdueNotice");
        }
      }
    );
    // }
  });
};

const extractFromStorage = async (key) => {
  const result = await new Promise((resolve) =>
    chrome.storage.local.get(key, resolve)
  );
  if (result[key]) {
    try {
      await navigator.clipboard.writeText(result[key]);
      chrome.storage.local.remove(key);
    } catch (error) {
      console.error(`Failed to copy ${key} to clipboard`, error);
    }
  }
};

const addEventListeners = () => {
  passiveTools.addEventListener("click", () => {
    chrome.storage.local.get("arePassiveToolsActive", (result) => {
      // Send message to background.js to toggle extension status
      chrome.storage.local.set(
        {
          arePassiveToolsActive: !result.arePassiveToolsActive,
        },
        () => {
          arePassiveToolsActive = !result.arePassiveToolsActive;
          passiveTools.checked = arePassiveToolsActive;
          chrome.runtime.sendMessage({
            command: "toggleExtension",
          });
        }
      );
    });
  });

  illActions.forEach((button) => {
    button.addEventListener("click", (event) => {
      const buttonId = event.target.id;
      initiateScript(buttonId);
    });
  });

  logoLeft.addEventListener("click", () => {
    logoLeft.classList.toggle("logo-left-animation");
  });

  logoRight.addEventListener("click", () => {
    logoRight.classList.toggle("logo-right-animation");
  });

  collapseToggle.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const mainSection = toggle.parentElement.nextElementSibling;
      if (mainSection.classList.contains("collapsed")) {
        mainSection.classList.remove("hidden");
        requestAnimationFrame(() => {
          mainSection.classList.remove("collapsed");
        });
      } else {
        mainSection.classList.add("collapsed");
        toggle.textContent = "Expand";
        setTimeout(() => {
          mainSection.classList.add("hidden");
        }, 300);
      }
      if (toggle.src.includes("collapse")) {
        toggle.src = chrome.runtime.getURL("images/expand.svg");
      } else {
        toggle.src = chrome.runtime.getURL("images/collapse.svg");
      }
    });
  });

  disableButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ command: "disableButton" });
  });

  lendingMode.addEventListener("click", () => {
    initiateScript("frequentLending");
    lendingMode.checked
      ? chrome.storage.local.set({ lendingMode: true })
      : chrome.storage.local.set({ lendingMode: false });
  });

  darkModeToggle.addEventListener("click", () => {
    initiateScript("darkMode");
    darkModeToggle.checked
      ? chrome.storage.local.set({ darkMode: true })
      : chrome.storage.local.set({ darkMode: false });
  });

  openCreateILL.addEventListener("click", () => {
    openCreateILL.checked
      ? chrome.storage.local.set({ openCreateILL: true })
      : chrome.storage.local.set({ openCreateILL: false });
  });

  autoReceiveRequestButton.addEventListener("click", () => {
    autoReceiveRequestButton.checked
      ? chrome.storage.local.set({ autoReceiveRequest: true })
      : chrome.storage.local.set({ autoReceiveRequest: false });
  });

  printLabel.addEventListener("click", () => {
    printLabel.checked
      ? chrome.storage.local.set({ printLabel: true })
      : chrome.storage.local.set({ printLabel: false });
  });
};

addEventListeners();

const setupDymo = () => {
  // Initialize the DYMO Label Framework
  dymo.label.framework.init(function () {
    console.log("DYMO Label Framework initialized");

    // Test loading a label
    const labelXml = `<?xml version="1.0" encoding="utf-8"?>
            <DieCutLabel Version="8.0" Units="twips">
                <PaperOrientation>Landscape</PaperOrientation>
                <Id>Address</Id>
                <PaperName>30252 Address</PaperName>
                <DrawCommands/>
                <ObjectInfo>
                    <TextObject>
                        <Name>Text</Name>
                        <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
                        <BackColor Alpha="0" Red="255" Green="255" Blue="255"/>
                        <LinkedObjectName/>
                        <Rotation>Rotation0</Rotation>
                        <IsMirrored>False</IsMirrored>
                        <IsVariable>True</IsVariable>
                        <HorizontalAlignment>Center</HorizontalAlignment>
                        <VerticalAlignment>Middle</VerticalAlignment>
                        <TextFitMode>ShrinkToFit</TextFitMode>
                        <UseFullFontHeight>True</UseFullFontHeight>
                        <Verticalized>False</Verticalized>
                        <StyledText>
                            <Element>
                                <String>Test Label</String>
                                <Attributes>
                                    <Font Family="Arial" Size="13" Bold="True" Italic="False" Underline="False" Strikeout="False"/>
                                    <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
                                </Attributes>
                            </Element>
                        </StyledText>
                    </TextObject>
                    <Bounds X="331" Y="150" Width="4680" Height="1260"/>
                </ObjectInfo>
            </DieCutLabel>`;

    const label = dymo.label.framework.openLabelXml(labelXml);
    console.log("Label loaded:", label);

    // Get printers
    const printers = dymo.label.framework.getPrinters();
    console.log("Printers:", printers);

    // Print a label (make sure you have a DYMO printer connected)
    if (printers.length > 0) {
      const printerName = printers[0].name; // Use the first printer found
      dymo.label.framework.printLabel(printerName, "", labelXml);
      console.log("Label printed");
    } else {
      console.log("No DYMO printers found");
    }
  });
};
