# PowILL Tools

## About

PowILL Tools is a browser extension to help manage processing ILL requests. It's filled with a hodgepodge of tools that made Jason's life easier, and may have mixed results for others.

## Key Features

### Processing Arriving Books

- Copy the title, patron barcode, lending library address, and WorldShare Request number at the click of a button.
- Insert all request data into the Evergreen 'Create ILL Item' screen formatted properly and without typos.
- Adds buttons for items that arrived in bags or that need to be returned in a box and inserts the appropriate note into the lender address field.
- Automatic alert when a WorldShare request came with a borrowing fee as a reminder to pass the cost onto the patron.
- Adds a popup when an item is coming from one of the libraries that requires us to hold onto their paperwork.
- Automatically inserts the due date into the Lender Address field for library systems that require that information like Bellingham Public.
- Prompts the user for the last four digits of the WCCLS barcode and includes it on the receipt along with the title, as requested by WCCLS.

### Mailroom Support

- Copies the address from the WorldShare request into the clipboard for pasting into Dymo.
- Identifies libraries on the courier, and includes that information prominently on the ILL return receipt.
- Automatically returns request
- Coming Soon: Alert when checking out or returning an item to a frequently used library to facilitate bundling.

### User Accounts

- When on a user's "Items Out" tab, generates an overdue ILL notice containing the title of lost or overdue ILL items currently checked out to the patron, and copies a letter to the patron to the clipboard that can be pasted into any email or word processing client.
- Automatically populate the Evergreen accounts of our external partners with the default set of criteria shared among all ILL accounts including:
  - Permission Group
  - Last name of ILL DEPT
  - District of residence set to unset
  - Adult date of birth

### Lending Side Support

- Adds buttons to the Place Hold screen of the libraries that do most of the borrowing from us.
- Examines a library's name and address to determine if they are likely on the Orbis Courier system.

### Optional Keyboard Shortcuts

These are the default keyboard shortcuts for the extension. They can be changed in the extension settings.

- `Ctrl+Shift+1`: Copy request data from WorldShare
- `Ctrl+Shift+2`: Paste the request data in Evergreen
- `Ctrl+Shift+3`: Generate an Overdue Letter
- `Ctrl+Shift+Y`: Copy WorldShare Address for Dymo
