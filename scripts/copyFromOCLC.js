// TODO: Add Canada provinces to convertStateNameToAbbreviation
// TODO: Add a check for Idaho libraries that don't include constant data in the address

function copyFromOCLC() {
  const imgURL = chrome.runtime.getURL("images/jason-128.png");
  console.log(chrome.runtime.getURL("images/jason-128.png"));
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
    const lender = document.querySelector(
      'span[data="lenderString.currentSupplier.symbol"]'
    );
    if (isBLP()) addressString += extractDueDate() + "\n\n";
    if (isWCCLS()) addressString += WCCLSprompt() + "\n\n";
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

  // Checks lender string to see if it is BLP
  const isBLP = () => {
    const nodeList = document.querySelector(
      'span[data="lenderString.currentSupplier.symbol"]'
    );
    return nodeList.innerText ? nodeList.innerText === "BLP" : false;
  };

  // Extracts OCLC Due Date
  const extractDueDate = () => {
    const nodeList = document.querySelector(
      'span[data="returning.originalDueToSupplier"]'
    );
    return nodeList.innerText ? "OCLC Due Date: " + nodeList.innerText : null;
  };

  // TODO: Combine the check lender functions for BLP and OQX into one with lender string as an argument

  // Checks if lender string is associated with WCCLS
  const isWCCLS = () => {
    const lenderString = document.querySelector(
      'span[data="lenderString.currentSupplier.symbol"]'
    );
    return lenderString.innerText ? lenderString.innerText === "OQX" : false;
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
        "Whoa there! This is from WCCLS! Please write the 4-digit code from their paperwork. (Also can be found as the last four digits of THEIR barcode)"
      );
    if (barcode) addressField += barcode;
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

  const statusModal = (data, backgroundColor, textColor) => {
    const modal = document.createElement("div");
    modal.setAttribute("id", "modal");
    modal.setAttribute(
      "style",
      `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 1rem;
      border-radius: 1rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: ${textColor};
      font-size: 4rem;
    `
    );
    modal.innerHTML = `
    <div>  
    <div style="background-color: ${backgroundColor}; padding: 1rem; border-radius: 1rem;">
    <img src=${imgURL} style="width: 100px; height: 100px; border-radius: 50%;">
    </div>
    <div>
    <h2>${data}</h2>
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
      let textColor = "#fff";
      await navigator.clipboard.writeText(data);
      if (!verifyClipboard(requestNum)) {
        throw new Error("Clipboard data does not match page data");
      }
      console.log("Copied to clipboard: ", requestNum);
      let result = `Copied! ${requestNum}`;
      statusModal(result, headerColor, textColor);
    } catch (err) {
      let result = "";
      let headerColor = "#e85e6a";
      let textColor = "#fff";
      if (err.message.includes("Document is not focused")) {
        result = "Suggested tip: Please click on the page and try again";
      } else {
        result = "Failed to copy! " + err;
      }
      statusModal(result, headerColor, textColor);
      console.log(err);
    }
  }

  copyToClipboard(stringifiedData, compiledData[1].requestNumber);
}

copyFromOCLC();
