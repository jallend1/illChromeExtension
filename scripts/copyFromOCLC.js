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

  const elementSelectors = {
    title: 'span[data="resource.title"]',
    requestNumber: ".accordionRequestDetailsRequestId",
    patronID: 'input[data="requester.patron.userId"]',
    lendingFee: 'input[name="billing.maxCost.amountAsString"]',
    dueDate: 'span[data="returning.originalDueToSupplier"]',
    currentLender: 'span[data="lenderString.currentSupplier.symbol"]',
    region: 'span[data="returning.address.region"]',
  };

  const extractValueFromField = (selector) => {
    const allMatches = document.querySelectorAll(selector);
    const currentMatch = allMatches[allMatches.length - 1];
    // If selector includes 'input' return the value, otherwise return the textContent
    return selector.includes("input")
      ? currentMatch?.value
      : currentMatch?.textContent;
  };

  const convertStateNameToAbbreviation = (stateName) => {
    // If the stateName is undefined return an empty string
    if (!stateName) return "";
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
      let region = extractValueFromField(elementSelectors.region);
      region
        ? (addressObject[key] = convertStateNameToAbbreviation(region))
        : (addressObject[key] = "NONE");
    } else {
      let element = extractValueFromField(
        `input[data="returning.address.${key}"]`
      );
      element ? (addressObject[key] = element) : (addressObject[key] = "");
    }
  };

  // Iterate through addressObject keys and extract values from page
  Object.keys(addressObject).forEach(assignAddressObjectValues);

  const formatLenderAddress = () => {
    let addressString = "";
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

  // Format lender address and notes
  const generateLenderAddressNotes = () => {
    let addressString = "";
    const currentLender = extractValueFromField(elementSelectors.currentLender);
    if (isCourier(currentLender)) addressString += "Courier\n";
    addressString += checkLenderRequirements(currentLender);
    addressString += formatLenderAddress();
    return addressString;
  };

  // Prompts user for WCCLS barcode
  const WCCLSprompt = () => {
    let barcode;
    let addressField = "";
    const title =
      "Title: " + extractValueFromField(elementSelectors.title) + "\n";
    addressField += title;
    while (!barcode) {
      barcode = prompt(
        "This is from WCCLS! Please write the 4-digit code from their paperwork. (Also can be found as the last four digits of THEIR barcode)"
      );
      if (barcode) addressField += "WCCLS barcode: " + barcode + "\n";
    }
    return addressField;
  };

  const checkLenderRequirements = (currentLender) => {
    // BLP Needs due date extracted from page
    if (currentLender === "BLP") {
      const dueDate = extractValueFromField(elementSelectors.dueDate);
      return "OCLC Due Date: " + dueDate + "\n";
    }
    // Implements WCCLS unique requirements
    if (currentLender === "OQX") return WCCLSprompt();
    // Checks to see if the current lender requires paperwork to be kept
    requiresPaperwork(currentLender);
    return "";
  };

  const requiresPaperwork = (oclcSymbol) => {
    const paperworkLibraries = ["COW", "DLC", "WSE", "YEP", "ZWR"];
    if (paperworkLibraries.includes(oclcSymbol)) {
      alert("This library would like us to keep the paperwork.");
    }
  };

  const isCourier = (oclcSymbol) => {
    const orbisLibraries = [
      "AHP",
      "ALOHA",
      "BAY",
      "BLP",
      "BMT",
      "BRD",
      "CCK",
      "CCV",
      "CEO",
      "CHK",
      "CHY",
      "CLK",
      "CTGRT",
      "CWU",
      "DCH",
      "DUFUR",
      "EI1",
      "ELGJL",
      "EOS",
      "EPUBL",
      "ESR",
      "GFC",
      "GHZ",
      "HEPNR",
      "HRNYC",
      "HRS",
      "HRVHS",
      "HTM",
      "IDLEW",
      "IDMPL",
      "JCL",
      "K#T",
      "KCL",
      "LCS",
      "LCS/ORDRI",
      "LGRND",
      "LIQ",
      "LOP/LIQ",
      "MAA",
      "MFW",
      "MHD",
      "MLH",
      "NON",
      "NOPPL",
      "NTD",
      "NTE",
      "NTG",
      "NWE",
      "NYSSA",
      "O2G",
      "O3D",
      "O3L/BAY",
      "OC3",
      "OCORM",
      "OEI",
      "OEM",
      "OHS",
      "OIN",
      "OIT",
      "OLB",
      "OLC",
      "OLE",
      "OLL",
      "OLP",
      "ONA",
      "ONS",
      "ONTHS",
      "ONTMS",
      "OOAPL",
      "OOIPL",
      "OOJPL",
      "OOLPL",
      "OOMAP",
      "OOMGL",
      "OOO",
      "OOR",
      "OOS",
      "OOSPL",
      "OOSPU",
      "OOT",
      "OOV",
      "OOWIL",
      "OOY",
      "OOZ",
      "OPA",
      "OPB",
      "OPF",
      "OPG",
      "OPI",
      "OPJ",
      "OPN",
      "OPU",
      "OPV",
      "OQH",
      "OQP",
      "OQR",
      "OQS",
      "OQT",
      "OQU",
      "OQV",
      "OQW",
      "OQX",
      "OR4",
      "ORAPL",
      "ORC",
      "ORDRI",
      "ORE",
      "ORGCL",
      "ORI",
      "ORION",
      "ORKCC",
      "ORLCL",
      "ORR",
      "ORU",
      "ORWCL",
      "ORWLP",
      "ORX",
      "ORZ",
      "OSE",
      "OSF",
      "OSO",
      "OUP",
      "OWN",
      "OWP",
      "OWS",
      "OWT",
      "OWW/BAY",
      "OWY",
      "OWZ",
      "OXA",
      "OXD",
      "OXE",
      "OXF",
      "OXG",
      "OXO",
      "OXP",
      "OXR",
      "PEN",
      "PNWCA",
      "RLS",
      "SCPSL",
      "SOS",
      "SWCLB",
      "SWO",
      "TAW",
      "TCO",
      "TMBCC",
      "TVC",
      "UAG",
      "UOJ",
      "UOK",
      "UPP",
      "VALEH",
      "W9L",
      "WAC",
      "WAU",
      "WAUWB",
      "WAUWT",
      "WBS",
      "WC4",
      "WEA",
      "WK0",
      "WOS",
      "WRJ",
      "WS2",
      "WS7",
      "WSE",
      "WSL",
      "WSN",
      "WTV",
      "WUG",
      "XFF",
      "XFH",
      "XV9",
      "XVJ",
      "XYT",
      "YEP",
      "YEQ",
      "Z$8",
      "ZVR",
      "ZWR",
      "ZXQ",
      "ZXS",
      "ZXT",
      "ZY4",
    ];
    return orbisLibraries.includes(oclcSymbol);
  };

  // Bundles all pertinent information into an object
  const compileRequestData = () => {
    const addressString = generateLenderAddressNotes();
    const requestNumber = extractValueFromField(elementSelectors.requestNumber);
    const title = extractValueFromField(elementSelectors.title);
    const patronID = extractValueFromField(elementSelectors.patronID);
    const isLendingFee = extractValueFromField(elementSelectors.lendingFee);

    return {
      addressString,
      requestNumber,
      title,
      patronID,
      isLendingFee,
    };
  };

  const convertDataToJSON = (data) => {
    return JSON.stringify(data);
  };

  const compiledData = compileRequestData();
  const stringifiedData = convertDataToJSON(compiledData);

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

  async function copyToStorage(data, requestNum, lendingFee) {
    try {
      const success = {
        headerColor: "#4CAF50",
        imgURL: chrome.runtime.getURL("images/kawaii-dinosaur.png"),
        result: `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Success!</h2> <p style="font-size: 1rem;">Request Number: ${requestNum}</p>`,
      };

      // Checks for requestData in local storage, and if it exists, removes it
      chrome.storage.local.get(["requestData", "lendingFee"], (result) => {
        if (result.requestData) chrome.storage.local.remove("requestData");
        if (result.lendingFee) chrome.storage.local.remove("lendingFee");
        chrome.storage.local.set(
          {
            requestData: data,
            lendingFee: lendingFee,
          },
          () => {
            statusModal(success.result, success.headerColor, success.imgURL);
          }
        );
      });
    } catch (err) {
      let result = "";
      let imgURL = chrome.runtime.getURL("images/kawaii-book-sad.png");
      let headerColor = "#e85e6a";
      if (err.message.includes("Document is not focused")) {
        result = `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Error!</h2> <p style="font-size: 1rem;">Suggested tip: Please click on the page and try again</p>`;
      } else {
        result = `<h2 style="font-weight: thin; padding: 1rem; color: #3b607c">Error!</h2> <p style="font-size: 1rem;">"${err}";</p>`;
      }
      statusModal(result, headerColor, imgURL);
      console.error(err);
    }
  }

  const lendingFee = extractValueFromField(elementSelectors.lendingFee);

  copyToStorage(stringifiedData, compiledData.requestNumber, lendingFee);
}

copyFromOCLC();
