// TODO: Add Canada provinces to convertStateNameToAbbreviation
// TODO: Add a check for Idaho libraries that don't include constant data in the address

function copyFromOCLC() {
  // Sets up addressObject with names matching OCLC address fields so it can be iterated through later
  let addressObject = {
    attention: null,
    line1: null,
    line2: null,
    locality: null,
    region: null,
    postal: null,
  };

  const convertStateNameToAbbreviation = (stateName) => {
    const states = {
      Alabama: "AL",
      Alaska: "AK",
      "American Samoa": "AS",
      Arizona: "AZ",
      Arkansas: "AR",
      California: "CA",
      Colorado: "CO",
      Connecticut: "CT",
      Delaware: "DE",
      "District Of Columbia": "DC",
      "Federated States Of Micronesia": "FM",
      Florida: "FL",
      Georgia: "GA",
      Guam: "GU",
      Hawaii: "HI",
      Idaho: "ID",
      Illinois: "IL",
      Indiana: "IN",
      Iowa: "IA",
      Kansas: "KS",
      Kentucky: "KY",
      Louisiana: "LA",
      Maine: "ME",
      "Marshall Islands": "MH",
      Maryland: "MD",
      Massachusetts: "MA",
      Michigan: "MI",
      Minnesota: "MN",
      Mississippi: "MS",
      Missouri: "MO",
      Montana: "MT",
      Nebraska: "NE",
      Nevada: "NV",
      "New Hampshire": "NH",
      "New Jersey": "NJ",
      "New Mexico": "NM",
      "New York": "NY",
      "North Carolina": "NC",
      "North Dakota": "ND",
      "Northern Mariana Islands": "MP",
      Ohio: "OH",
      Oklahoma: "OK",
      Oregon: "OR",
      Palau: "PW",
      Pennsylvania: "PA",
      "Puerto Rico": "PR",
      "Rhode Island": "RI",
      "South Carolina": "SC",
      "South Dakota": "SD",
      Tennessee: "TN",
      Texas: "TX",
      Utah: "UT",
      Vermont: "VT",
      "Virgin Islands": "VI",
      Virginia: "VA",
      Washington: "WA",
      "West Virginia": "WV",
      Wisconsin: "WI",
      Wyoming: "WY",
    };
    return states[stateName];
  };

  const assignAddressObjectValues = (key) => {
    if (key === "region") {
      let nodeList = document.querySelectorAll(
        'span[data="returning.address.region"]'
      );
      nodeList.length > 0
        ? (addressObject[key] = convertStateNameToAbbreviation(
            nodeList[nodeList.length - 1].innerText
          ))
        : (addressObject[key] = "NONE");
    } else {
      let nodeList = document.querySelectorAll(
        `input[data="returning.address.${key}"]`
      );
      nodeList.length > 0
        ? (addressObject[key] = nodeList[nodeList.length - 1].value)
        : (addressObject[key] = null);
    }
  };

  // Iterate through addressObject keys and extract values from page
  Object.keys(addressObject).forEach(assignAddressObjectValues);

  // Format addressObject for mail label
  const createAddressString = () => {
    let addressString = "";
    addressString += checkLenderRequirements();
    Object.keys(addressObject).forEach((key) => {
      switch (key) {
        case "attention":
        case "line1":
        case "line2":
          if (addressObject[key] !== "")
            addressString += addressObject[key] + "\n";
          break;
        case "locality":
          addressString += addressObject[key] + ", ";
          break;
        case "region":
          addressString += addressObject[key] + " ";
          break;
        case "postal":
          addressString += addressObject[key];
          break;
        default:
          break;
      }
    });
    return addressString;
  };

  const checkLenderRequirements = () => {
    const paperworkLibraries = ["DLC"];
    const nodeList = document.querySelectorAll(
      'span[data="lenderString.currentSupplier.symbol"]'
    );
    // OCLC seems to stack requests intermittently -- This pulls the latest
    const currentLender = nodeList[nodeList.length - 1].innerText;
    // BLP Needs due date extracted from page
    if (currentLender === "BLP") return extractDueDate();
    // Implements WCCLS unique requirements
    if (currentLender === "OQX") return WCCLSprompt();
    // Hayden doesn't have its name in the constant fields
    if (currentLender === "K#T") return "Hayden Branch Library ";
    // Checks to see if the current lender requires paperwork to be kept
    if (paperworkLibraries.includes(currentLender)) {
      alert("This library would like us to keep the paperwork.");
    }
    return "";
  };

  // Extracts OCLC Due Date
  const extractDueDate = () => {
    const nodeList = document.querySelector(
      'span[data="returning.originalDueToSupplier"]'
    );
    return nodeList.innerText ? "OCLC Due Date: " + nodeList.innerText : null;
  };

  // Prompts user for WCCLS barcode
  const WCCLSprompt = () => {
    let addressField = "";
    let barcode = "";
    let title = "";
    title = document.querySelector('span[data="resource.title"]').innerText;
    if (title) addressField = "Title: " + title + "\n";
    barcode =
      "WCCLS barcode: " +
      prompt(
        "This is from WCCLS! Please write the 4-digit code from their paperwork. (Also can be found as the last four digits of THEIR barcode)"
      );
    if (barcode) addressField += barcode + "\n";
    return addressField;
  };

  // Bundles all pertinent information into an object
  const compileRequestData = () => {
    const addressString = createAddressString();
    const allRequestNumbers = document.querySelectorAll(
      ".accordionRequestDetailsRequestId"
    );
    const requestNumber =
      allRequestNumbers[allRequestNumbers.length - 1].textContent;
    const allTitles = document.querySelectorAll('span[data="resource.title"]');
    const title = allTitles[allTitles.length - 1].textContent;
    const allPatronIDs = document.querySelectorAll(
      'input[data="requester.patron.userId"]'
    );
    const patronID = allPatronIDs[allPatronIDs.length - 1].value;

    return [{ addressString }, { requestNumber }, { title }, { patronID }];
  };

  const convertDataToJSON = (data) => {
    return JSON.stringify(data);
  };

  const compiledData = compileRequestData();
  const stringifiedData = convertDataToJSON(compiledData);

  // Unsure how to recreate the conditions that have caused this error -- Hopefully this resolves it?
  const verifyClipboard = (clipboardRequestNum) => {
    const allRequestNumbers = document.querySelectorAll(
      ".accordionRequestDetailsRequestId"
    );
    const requestNumberFromPage =
      allRequestNumbers[allRequestNumbers.length - 1].textContent;
    return clipboardRequestNum === requestNumberFromPage;
  };

  const statusModal = (data, backgroundColor, imgURL) => {
    const modal = document.createElement("div");
    modal.setAttribute("id", "modal");
    modal.setAttribute(
      "style",
      `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 1rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: #000;
      font-size: 4rem;
      border: 1px solid #000;
      box-shadow: 0 0 10px 5px #000;
    `
    );
    modal.innerHTML = `
    <div>  
    <div style="background-color: ${backgroundColor}; padding: 1rem; border-radius: 1rem 1rem 0 0; text-align: center;">
    <img src=${imgURL} style="width: 100px; height: 100px; border-radius: 50%;">
    </div>
    <div style="background-color: #f9f9f9;  text-align: center; border-radius: 0 0 1rem 1rem; padding: 1rem;">
    ${data}
    </div>
    </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => {
      modal.remove();
    }, 3000);
  };

  async function copyToClipboard(data, requestNum) {
    try {
      let headerColor = "#4CAF50";
      let imgURL = chrome.runtime.getURL("images/kawaii-dinosaur.png");
      // await navigator.clipboard.writeText(data);
      chrome.storage.local.set({ requestData: data }, () => {
        console.log("Data stored");
      });
      console.log("Data copied to local storage! ", data);
      if (!verifyClipboard(requestNum)) {
        throw new Error("Clipboard data does not match page data");
      }
      console.log("Copied to clipboard: ", requestNum);
      let result = `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Success!</h2> <p style="font-size: 1rem;">Request Number: ${requestNum}</p>`;
      // statusModal(result, headerColor, imgURL);
    } catch (err) {
      let result = "";
      let imgURL = chrome.runtime.getURL("images/kawaii-book-sad.png");
      let headerColor = "#e85e6a";
      if (err.message.includes("Document is not focused")) {
        result = `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Error!</h2> <p style="font-size: 1rem;">Suggested tip: Please click on the page and try again</p>`;
      } else {
        result = `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Error!</h2> <p style="font-size: 1rem;">"${err}";</p>`;
      }
      // statusModal(result, headerColor, imgURL);
      console.error(err);
    }
  }

  copyToClipboard(stringifiedData, compiledData[1].requestNumber);
}

copyFromOCLC();
