(async () => {
  const { courierLibraries } = await import(
    chrome.runtime.getURL("modules/courierLibraries.js")
  );

  function courierHighlight(courierLibraries) {
    // Checks if patron name matches ILL name formatting
    const isLibrary = (patronLastName) => {
      return patronLastName === "ILL DEPT" || patronLastName === "LIBRARY";
    };

    // Checks if library state is a courier state to avoid false positives
    const isCourierState = () => {
      const courierStates = [", WA ", ", OR ", ", ID "];
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
        if (window.location.href.includes("search")) return;
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
        courierHighlight.innerHTML = `
            <div class="courier-highlight">
            <p style="color: green; font-size: smaller;">This is likely a courier library. Verify on the courier list.</p>
            </div>
        `;
        lead.appendChild(courierHighlight);
      }
    };
  }

  courierHighlight(courierLibraries);
})();
