export const elements = {
  collapseToggle: document.querySelectorAll("img.collapsible"),
  illActions: document.querySelectorAll(".ill-actions"),
  isbnSearch: document.querySelector("#isbn-search"),
  disableButton: document.querySelector("#disable-extension"),
  autoReceiveRequestButton: document.querySelector("#auto-receive-request"),
  lendingMode: document.querySelector("#lending-tools"),
  passiveTools: document.querySelector("#passive-tools"),
  printLabel: document.querySelector("#print-label"),
  autoReturnILL: document.querySelector("#auto-return-ill"),
  importMailroomData: document.querySelector("#import-mailroom-data"),
};

export const storageKeys = [
  { key: "autoReceiveRequest", element: elements.autoReceiveRequestButton },
  { key: "lendingMode", element: elements.lendingMode },
  { key: "arePassiveToolsActive", element: elements.passiveTools },
  { key: "printLabel", element: elements.printLabel },
  { key: "autoReturnILL", element: elements.autoReturnILL },
  { key: "mailData", element: elements.importMailroomData },
];

export const SCRIPTS_WITHOUT_CALLBACKS = [
  "isbnSearch",
  "sendPatronToWorldShare",
];
export const URL_PATTERNS = {
  EVERGREEN: ".kcls.org/eg2/en-US/staff/",
  WORLDSHARE: "kingcountylibrarysystem.share.worldcat.org",
};
