# FIMA flow

The `fima` construction flow adds the Latvian BIS work-record dashboard to the existing organization flow registry. Assign it through `/dashboard/admin/flow-configs`; the standard authorized project dashboard resolves the organization assignment and loads `FimaDashboard`. No organization assignment is changed by this implementation.

The dashboard is a frontend design prototype. Its local dataset is the 38 rows through 05.09.2026 from the 08.10.2026 Excel snapshot. Nine new BIS drafts, seven unique deleted BIS records, and two pending replacements are identified from the verified work. Other record labels come from Excel and do not imply live BIS approval.

Search, team filters, status tabs, pagination, table/board views, record details, notes, and temporary follow toggles run in the browser. There is no BIS synchronization, database write, file upload, or persistent follow-up notification. Existing construction site-diary functionality is reused.

`FimaWorkspace` accepts records and a runtime `siteId`. Embedded mode uses the main WorksRecorded navigation; standalone mode provides the complete design preview. Customer organization IDs are not hardcoded.

The official FIMA logo is stored at `public/logos/fima-official.png`, copied unchanged from `https://www.fima.lt/images/logo-main-png.png`, the logo used by `https://www.fima.lt/lv/`.

The FIMA palette follows the official website: `#bb252c` active navigation, `#9d0800` accents, `#820600` project banner, and `#363636` charcoal text. Arial is used for body text; the website’s Helvetica Neue LT Com light, bold, and condensed WOFF assets are stored under `public/fonts/fima/` and scoped to FIMA headings and navigation. Source: `https://www.fima.lt/css/screen.css` and its header, navigation, and content stylesheets.
