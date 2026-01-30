# PowILL Tools

## About

PowILL Tools is a Chrome extension designed to streamline Interlibrary Loan (ILL) workflows. It's filled with a hodgepodge of tools that made Jason's life easier at King County Library System, and may have mixed results for others. The extension provides end-to-end automation for every stage of your ILL workflow, from receiving requests to shipping materials and managing collections.

**Note:** This extension is specifically designed for workflows using OCLC WorldShare and Evergreen ILS. Your mileage may vary with other systems.

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The extension icon should appear in your browser toolbar

## Features

### Request Processing & Data Entry

Seamlessly transfer data from WorldShare to Evergreen with intelligent automation that eliminates repetitive typing.

- **One-Click Data Export** - Copy complete request data from WorldShare to Evergreen with keyboard shortcuts (Alt+Shift+1). Automatically extracts title, patron info, due dates, lending fees, and special requirements.

- **Auto-Populated Forms** - Never type the same data twice. Request details automatically populate in Evergreen's Create ILL form, including title, call number, patron barcode, and shipping addresses.

- **Elevates Important Information** - When entering items, elevates critical WorldShare notes to review before sending item to patron. Prominent alerts ensure special handling instructions and patron notes are never overlooked.

- **Auto-Receive in WorldShare** - Optional toggle that automatically marks requests as received in WorldShare after data export. Eliminates manual clicking and ensures timely status updates.

- **Send Patron to WorldShare** - Bridges Request Manager and WorldShare by extracting patron details (name, barcode, pickup location) and auto-populating WorldShare requester fields with seamless tab switching.

- **Library-Specific Requirements Processing** - Automatically detects and handles special requirements from specific lenders. Extracts OCLC due dates for BLP, ZWR, COW; prompts for 4-digit codes for OQX paperwork.

### Shipping & Addressing

Streamline your shipping workflow with automated label printing, courier detection, and material tracking.

- **DYMO Label Printing** - Print shipping labels instantly from WorldShare requests. One-click address extraction with automatic state abbreviation conversion and DYMO printer integration.

- **Improved Evergreen Address Labels** - Ensures the 20% of addresses that spill onto two labels fit conveniently onto a single label. Optimized formatting saves label stock and reduces shipping preparation time.

- **Courier Library Detection** - Automatically identifies courier-eligible libraries from the Orbis network. Green highlighting and validation prevent shipping costs for courier-delivered items.

- **Bag & Box Tracking** - Visual checkboxes track shipping materials. Mark items that arrived with bags or need box returns, with automatic note insertion in the address field.

- **Virtual Bookshelf** - Track frequently-used borrowing libraries with automatic alerts. The extension remembers lending partners you've worked with before and highlights familiar suppliers.

- **Package Frequency Tracking** - See how often you ship to each library. Historical frequency data helps with supply planning and identifies your most active lending partners.

### Lending Operations

Accelerate lending workflows with quick-access tools, automated searches, and intelligent hold placement.

- **Lending Mode Toolbar** - Quick-access toolbar for frequently-used lending libraries. One-click barcode entry for your most common sharing partners, reducing search time and improving workflow speed.

- **ISBN Quick Search** - Search your catalog directly from WorldShare lending requests. Extracts ISBN and title, opens Evergreen search, and tracks duplicate lookups.

- **Smart Hold Placement** - Automatically handles second patron holds on departmental cards. Detects lending fees, highlights special patron types, and provides one-click patron editing.

- **Edit Patron Button** - When placing a hold, adds a button that retrieves the current patron to allow editing for those pesky inactive cards. Quick patron access without leaving the hold screen.

- **Second Patron Auto-Processing** - Automatically places holds on departmental cards when items have a second patron. Watches for button enable/disable status and auto-clicks to complete dual patron workflows.

- **Profile Type Highlighting** - Highlights "Outreach" and "ADA Circulation" patron accounts with yellow background for immediate visual recognition of special handling needs during hold placement.

### Patron & Account Management

Maintain consistent patron records and streamline account operations with automated data entry and fee tracking.

- **Update ILL Evergreen Addresses** - Auto-fill consistent Interlibrary Loan patron type information like District of Residence, Patron Type, and last name. Ensures standardized ILL account setup across the system.

- **Auto Long Due Dates** - Automatically sets 10-week due dates for ILL checkouts. No more manual date calculation or selecting specific dates — just scan and go.

- **Lending Fee Alerts** - Never miss a lending fee. Automatic detection and prominent display of charges from lending libraries, with integrated patron lookup for fee processing.

### Collections & Billing

Generate professional notices and invoices with one-click automation for overdue and lost materials.

- **Overdue Notice Generator** - Generate professional overdue letters with Alt+Shift+3. Automatically scans patron accounts, identifies overdue ILL items, and creates formatted notices ready to send.

- **Automatic Library Invoice Generation** - Generate professional invoices for materials lost by other library systems. Creates formatted billing letters with item details and contact information, ready to send.

### Workflow Optimization & Interface Enhancements

Boost productivity with keyboard shortcuts, visual indicators, and smart automation that eliminates friction.

- **Keyboard Shortcuts** - Power-user keyboard shortcuts for common tasks. Ctrl+Enter for hold submission, Alt+Shift+Y for address copying, and visual shortcut reminders on relevant pages.

- **Visual Status Indicators** - Color-coded request statuses make priorities obvious at a glance. Red for urgent recalls, green for healthy due dates, yellow for special handling notes.

- **Dismissal of Unneeded Alerts** - Automatically removes 'Item in transit' alerts when checking out ILL materials. Streamlines checkout workflow by clearing irrelevant notifications without manual intervention.

- **Borrowing Notes Highlighting** - On lending requests, highlights borrowing notes with yellow background for emphasis. Ensures special borrowing conditions and requirements are immediately visible.

- **Request Manager Quick Tools** - Adds "Copy Title & Author" and "Search Amazon" buttons in Request Manager modal. Quick research for unknown items using ISBN or title with professional button styling.

### Vendor Management

Quickly compare vendor prices for multiple items to make informed purchasing decisions.

- **Bulk Vendor Price Checking** - Check Kinokuniya prices for multiple ISBNs simultaneously. Paste a list of ISBNs, and the extension retrieves pricing and availability for all items in seconds.

## Keyboard Shortcuts

These are the default keyboard shortcuts for the extension. They can be customized in `chrome://extensions/shortcuts`.

- **Alt+Shift+1**: Copy request data from WorldShare
- **Alt+Shift+3**: Generate an Overdue Letter
- **Alt+Shift+Y**: Copy WorldShare Address for Dymo
- **Ctrl+Enter**: Submit hold placement (on hold screens)

## Configuration

The extension includes several toggles accessible from the sidepanel:

- **Auto-Receive Request** - Automatically marks requests as received in WorldShare after data export
- **Print Label** - Automatically triggers label printing workflow
- **Auto-Return ILL** - Automatically returns request after shipping
- **Lending Mode** - Enables lending-specific toolbar and features
- **Passive Tools** - Controls background automation behaviors

## Known Limitations

- Designed specifically for King County Library System's workflow with Evergreen and WorldShare
- Some features may require specific library configurations or courier memberships (e.g., Orbis Cascade Alliance)
- DYMO label printing requires DYMO Label Software and compatible label printer

## Contributing

This extension was built to solve very specific workflow problems at a specific library system. If you find bugs or have suggestions for improvements that might benefit other libraries using similar systems, feel free to open an issue or submit a pull request.
