// Selectors for various DOM elements in the side panel
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

// Storage keys and their corresponding elements
export const storageKeys = [
  { key: "autoReceiveRequest", element: elements.autoReceiveRequestButton },
  { key: "lendingMode", element: elements.lendingMode },
  { key: "arePassiveToolsActive", element: elements.passiveTools },
  { key: "printLabel", element: elements.printLabel },
  { key: "autoReturnILL", element: elements.autoReturnILL },
  { key: "mailData", element: elements.importMailroomData },
];

// Scripts that do not require a callback function
export const SCRIPTS_WITHOUT_CALLBACKS = [
  "isbnSearch",
  "sendPatronToWorldShare",
];

// URL patterns and button groups for different systems
export const URL_PATTERNS = {
  EVERGREEN: ".kcls.org/eg2/en-US/staff/",
  WORLDSHARE: "kingcountylibrarysystem.share.worldcat.org",
};

export const BUTTON_GROUPS = {
  EVERGREEN: ["updateAddress", "overdueNotice"],
  WORLDSHARE: ["copyFromOCLC", "copyWorldShareAddress", "isbnSearch"],
};

// Clock constants
export const CONFIG = {
  ANIMATION_DELAY: 300,
  UPDATE_INTERVAL: 1000,
};

// Message types for communication
export const MESSAGE_TYPES = {
  TAB_URL_UPDATED: "tab-url-updated",
  STORAGE_UPDATED: "storage-updated",
  ADDRESS_READY: "addressReady",
  OVERDUE_NOTICE_READY: "overdueNoticeReady",
  LIBRARY_INVOICE_READY: "libraryInvoiceReady",
  SIDEPANEL_OPEN: "sidepanel-open",
  SIDEPANEL_CLOSE: "sidepanel-close",
};
