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

  const verifyClipboard = (clipboardRequestNum) => {
    const allRequestNumbers = document.querySelectorAll(
      ".accordionRequestDetailsRequestId"
    );
    const requestNumberFromPage =
      allRequestNumbers[allRequestNumbers.length - 1].textContent;
    return clipboardRequestNum === requestNumberFromPage;
  };

  const statusModal = (data, color) => {
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = color;
    modal.style.zIndex = "1000";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.color = "black";
    modal.style.fontSize = "4rem";
    color === "red"
      ? (modal.innerText = `Failed to copy: ${data}`)
      : (modal.innerText = `Data successfully copied for request number ${data}`);
    document.body.appendChild(modal);
    setTimeout(() => {
      modal.remove();
    }, 3000);
  };

  async function copyToClipboard(data, requestNum) {
    console.log(verifyClipboard(requestNum));
    try {
      await navigator.clipboard.writeText(data);
      console.log("Copied to clipboard: ", requestNum);
      statusModal(requestNum, "green");
    } catch (err) {
      console.error("Failed to copy: ", err);
      statusModal(err, "red");
    }
  }

  // navigator.clipboard.writeText(stringifiedData);
  copyToClipboard(stringifiedData, compiledData[1].requestNumber);
}

copyFromOCLC();
