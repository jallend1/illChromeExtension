(async () => {
  const { courierLibraries } = await import(
    chrome.runtime.getURL("modules/courierLibraries.js")
  );

  const { buttonStyles } = await import(
    chrome.runtime.getURL("modules/utils.js")
  );

  const courierStates = [", WA ", ", OR ", ", ID "];

  function courierHighlight(courierLibraries) {
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
        // Doesn't run it if on the search page
        if (window.location.href.includes("search")) {
          sendResponse({
            response: "Courier Highlighting doesn't run on the search page",
          });
          return;
        }
        let patronNameElement;
        patronNameElement = document.querySelector(".patron-status-color h4");

        if (!patronNameElement) {
          const interval = setInterval(() => {
            patronNameElement = document.querySelector(
              ".patron-status-color h4"
            );
            if (patronNameElement) {
              clearInterval(interval); // Stop checking once patronName has a value
              processName(patronNameElement.textContent)
                ? insertCourierAlert()
                : null;
            }
          }, 100);

          const timeout = setTimeout(() => {
            console.log("Patron name not found -- Courier Highlight");
            clearInterval(interval);
          }, 4000);

          const checkInterval = setInterval(() => {
            if (patronNameElement) {
              clearTimeout(timeout);
              clearInterval(checkInterval);
            }
          }, 100);
        } else {
          processName(patronNameElement.textContent)
            ? insertCourierAlert()
            : null;
        }

        sendResponse({ response: "Message received" });
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

        const hoverStyles = {
          ...buttonStyles,
          background: "linear-gradient(135deg, #e2e6ea 0%, #f5f7fa 100%)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.13)",
          transform: "translateY(-2px) scale(1.04)",
        };

        // Create the button
        const button = document.createElement("button");
        button.textContent = "Likely a Courier Library";
        button.title = "Open the courier list in a new tab";
        button.type = "button";

        // Apply base styles
        Object.assign(button.style, buttonStyles);

        // Add hover effect
        button.addEventListener("mouseover", () => {
          Object.assign(button.style, hoverStyles);
        });
        button.addEventListener("mouseout", () => {
          Object.assign(button.style, buttonStyles);
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
