export const borrowingAddressSelectors = {
  attention: 'input[data="returning.address.attention"]',
  line1: 'input[data="returning.address.line1"]',
  line2: 'input[data="returning.address.line2"]',
  locality: 'input[data="returning.address.locality"]',
  region: 'span[data="returning.address.region"]',
  postal: 'input[data="returning.address.postal"]',
};

// TODO: Refactor this because hot damn is it a mess
// --- Selectors ---
export const borrowingSelectors = {
  queue: {
    requestHeader: "#requests > div:not([class*='hidden']) .nd-request-header",
    requestStatus:
      "#requests > div:not([class*='hidden']) span[data='requestStatus']",
    dispositionElement:
      "#requests > div:not([class*='hidden']) span[data='disposition']",
    dueDateElement:
      '#requests > div:not([class*="hidden"]) span[data="returning.originalDueToSupplier"]',
    renewalDueDateElement:
      '#requests > div:not([class*="hidden"]) span[data="returning.dueToSupplier"]',
    titleElement:
      '#requests > div:not([class*="hidden"]) span[data="resource.title"]',
  },
  direct: {
    requestHeader:
      "div:not(.yui3-default-hidden) .nd-request-header:not(div.yui3-default-hidden .nd-request-header)",
    requestStatus:
      "div:not(.yui3-default-hidden) span[data='requestStatus']:not(div.yui3-default-hidden span)",
    dispositionElement:
      "div:not(.yui3-default-hidden) span[data='disposition']:not(div.yui3-default-hidden span)",
    dueDateElement:
      'div:not(.yui3-default-hidden) span[data="returning.originalDueToSupplier"]:not(div.yui3-default-hidden span)',
    renewalDueDateElement:
      'div:not(.yui3-default-hidden) span[data="returning.dueToSupplier"]:not(div.yui3-default-hidden span)',
    titleElement:
      'div:not(.yui3-default-hidden) span[data="resource.title"]:not(div.yui3-default-hidden span)',
  },
};

export const lendingSelectors = {
  queue: {
    borrowingNotes: `#requests > div:not([class*="hidden"]) span[data="requester.note"]`,
  },
  direct: {
    borrowingNotes: `div:not(.yui3-default-hidden) span[data="requester.note"]`,
  },
};

export const createILL = {
  SELECTORS: {
    TITLE_INPUT: "#title-input",
    CALLNUMBER_INPUT: "#callnumber-input",
    PATRON_BARCODE_INPUT: "#patron-barcode-input",
    ITEM_BARCODE_INPUT: "#item-barcode-input",
    PATRON_ADDRESS: "textarea",
  },
  PREFIXES: {
    TITLE: "ILL Title - ",
    CALL_NUMBER: "IL",
  },
  SPECIAL_TEXT: {
    BAG: "**BAG**\n",
    BOX: "**RETURN IN BOX**\n",
  },
};
