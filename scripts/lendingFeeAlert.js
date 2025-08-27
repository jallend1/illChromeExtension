(async () => {
  // TODO: statusModal not actually being used right now
  const { statusModal } = await import(
    chrome.runtime.getURL("modules/modal.js")
  );

  // TODO: In progress - Verify patron name against WorldShare; Auto-update pickup location to request info
  const extractPatronDataFromStorage = () => {
    chrome.storage.local.get("requestData", (result) => {
      if (!result.requestData) return;
      const { patronName } = JSON.parse(result.requestData);
      console.log(patronName);
      const nameField = patronName.split(", ");
      // Converts name to match Evergreen formatting
      const name =
        nameField[0].toUpperCase() + ", " + nameField[1].toUpperCase();
      const pickupLocation = nameField[2];
      console.log("Name: ", name, "Pickup Location: ", pickupLocation);
    });
  };

  // TODO: Run this function on the Place Hold screen and repeat until the h3 element also includes a name in parentheses
  const compareNames = (patronName) => {
    const h3Elements = document.querySelectorAll("h3");
    const nameElement = Array.from(h3Elements).find((element) =>
      element.textContent.includes("Place Hold")
    );
  };

  extractPatronDataFromStorage();
})();
