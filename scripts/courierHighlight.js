(async () => {
  const { courierLibraries } = await import(
    chrome.runtime.getURL("data/courierLibraries.js")
  );

  const { buttonStyles, waitForElementWithInterval } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  const courierStates = [", WA ", ", OR ", ", ID "];

  async function courierHighlight(courierLibraries) {
    // Checks if patron name matches ILL name formatting
    const isLibrary = (patronLastName) =>
      ["ILL DEPT", "LIBRARY"].includes(patronLastName);

    // Checks if library state is a courier state to avoid false positives
    const isCourierState = () => {
      const addressField = document.querySelector(
        "textarea[id*='patron-address-copy']"
      );
      return courierStates.some((state) =>
        addressField.textContent.includes(state)
      );
    };

    // Checks if library name is in courierLibraries array
    const isCourierLibrary = (rawLibraryName) => {
      // Courier list uses UNIV instead of Evergreen's UNIVERSITY
      let isCourier;
      let modifiedLibraryName;
      if (rawLibraryName.includes("UNIVERSITY")) {
        modifiedLibraryname = rawLibraryName.replace("UNIVERSITY", "UNIV");
      }
      isCourier = courierLibraries.find((library) =>
        library.toUpperCase().includes(modifiedLibraryName)
      );

      // Evergreen often stores the university name in the the address field, so if not found in the name, check there
      if (!isCourier) {
        const addressField = document.querySelector(
          "textarea[id*='patron-address-copy']"
        ).textContent;

        const modifiedAddressField = addressField.replace("UNIVERSITY", "UNIV");

        courierLibraries.forEach((library) => {
          if (modifiedAddressField.includes(library.toUpperCase())) {
            isCourier = true;
          }
        });
      }
      return isCourier;
    };

    // Initiates processing of library to determine if it is a courier library
    const processName = (patronName) => {
      const [patronLastName, patronLibraryName] = patronName
        .split(", ")
        .map((name) => name.trim());
      if (!isLibrary(patronLastName)) return false;
      if (!isCourierState()) return false;
      if (!isCourierLibrary(patronLibraryName)) return false;
      return true;
    };

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.data === "courierHighlight") {
        (async () => {
          try {
            // Doesn't run it if on the search page
            if (window.location.href.includes("search")) {
              sendResponse({
                response: "Courier Highlighting doesn't run on the search page",
              });
              return;
            }

            // Waits for patron name to appear on the page
            const patronNameElement = await waitForElementWithInterval(
              ".patron-status-color h4"
            );

            if (processName(patronNameElement?.textContent)) {
              insertCourierAlert();
              sendResponse({
                response: "Courier library detected and highlighted",
              });
            } else {
              sendResponse({ response: "Not a courier library" });
            }
          } catch (error) {
            console.error("Error in courierHighlight:", error);
            sendResponse({
              response: "An error occurred",
              error: error.message,
            });
          }
        })();
        // Return true to indicate the response will be sent asynchronously and eliminate those nasty errors
        return true;
      }
    });

    // Inserts courier alert into patron page

    const insertCourierAlert = () => {
      const lead = document.querySelector(".lead");
      const courierHighlightExists =
        document.querySelector(".courier-highlight");
      if (!courierHighlightExists) {
        const courierHighlight = document.createElement("div");
        courierHighlight.className = "courier-highlight";
        courierHighlight.style.margin = "1rem";

        courierHighlight.style.display = "flex";
        courierHighlight.style.alignItems = "center";
        courierHighlight.style.justifyContent = "center";

        const greenButtonStyles = {
          ...buttonStyles,
          background: "linear-gradient(135deg, #b7f8db 0%, #50e3c2 100%)",
          color: "#1b3a2b",
          border: "1px solid #50e3c2",
        };

        const greenHoverStyles = {
          ...greenButtonStyles,
          background: "linear-gradient(135deg, #50e3c2 0%, #b7f8db 100%)",
          boxShadow: "0 4px 16px rgba(80, 227, 194, 0.18)",
          transform: "translateY(-2px) scale(1.04)",
        };

        // Create the button
        const button = document.createElement("button");
        button.textContent = "Likely a Courier Library";
        button.title = "Open the courier list in a new tab";
        button.type = "button";

        // Apply base styles
        Object.assign(button.style, greenButtonStyles);

        // Add hover effect
        button.addEventListener("mouseover", () => {
          Object.assign(button.style, greenHoverStyles);
        });
        button.addEventListener("mouseout", () => {
          Object.assign(button.style, greenButtonStyles);
        });

        // Open courier list on click
        button.addEventListener("click", () => {
          window.open(
            "https://docs.google.com/spreadsheets/d/1wisjUQEoMlPOI4HKtNJ8CiMD-fHMZTq5LOTjtqqBwXo/edit?pli=1&gid=0#gid=0",
            "_blank"
          );
        });

        courierHighlight.appendChild(button);
        lead.appendChild(courierHighlight);
      }
    };
  }

  courierHighlight(courierLibraries);
})();
