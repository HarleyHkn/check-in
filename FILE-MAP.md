# FILE-MAP

"I want to work on X — what do I open?" A lookup table, not prose — see `CLAUDE.md` for the narrative architecture description and the reasoning behind it.

## Home ("Check In") page
- `public/js/home-page.js` — the whole page: Weight/Steps toggle box, save/delete, the Mon–Sun day strip, Avg weight/Avg steps tiles
- `public/js/weights-ui.js`, `public/js/steps-ui.js` — where the weight/steps numbers actually come from and get saved
- `public/js/calender.js` — `buildDataDots()` (the little dots in the day strip) lives here, reused from the Calendar page
- `public/css/home.css` — the input box + day-strip styling
- `public/index.html` — the `#homePage` section
- `routes/weights.js`, `routes/steps.js` — the backend endpoints it saves to

## Overview page
- `public/js/overview.js` — the whole page: week selector, stats, trend charts
- `public/js/trend-chart.js` — the actual SVG chart-drawing widget it calls
- `public/js/weights-ui.js`, `public/js/steps-ui.js`, `public/js/measurements-ui.js` — where the numbers it charts come from
- `public/css/overview.css` — the panel + chart styling
- `public/index.html` — the `#overviewPage` section

## Weekly page
- `public/js/weekly-page.js` — assembles the card/toggle bar and decides which weeks to show
- `public/js/weekly-tabs.js` — builds the *content* of each of the 4 tabs (Weight/Steps/Measure/Photo)
- `public/css/weekly.css` — the weekly-specific styling (also borrows some from `photos.css`, see that file's comments)
- `public/index.html` — the `#weeklyPage` section

## Calendar page
- `public/js/calender.js` — the whole page: month grid, week-number buttons, `isWeekFullyComplete()`
- `public/css/calendar.css` — the grid/header/week-button styling
- `public/index.html` — the `#calendarPage` section
- Opens `public/js/modal.js` (day popup) and `public/js/week-modal.js` (week popup) when you click a cell

## Photos page
- `public/js/photos-page.js` — the whole page: week cards, Front/Back/Side boxes, filter pills
- `public/js/photos-ui.js` — where photo metadata/URLs/upload/delete actually happen
- `public/css/photos.css` — the filter bar/card/angle-box styling
- `public/index.html` — the `#photosPage` section
- `routes/photos.js` — the backend endpoint (upload resizing via `sharp`, storage as `bytea`)

## Login / signup / session
- `public/js/auth-ui.js` — the whole thing: login/signup forms, `authState` (`isLoggedIn`/`pendingSaveAction`), logout, session check on load
- `public/css/auth.css` — the login/signup form styling
- `routes/auth.js` — the backend endpoints (`/signup`, `/login`, `/logout`, `/whoami`)

## Shared modal (day popup + week popup + login/signup)
- `public/js/modal.js` — the shared shell (open/close, `modalState.mode`, `handleModalSave()` dispatch) + the day popup itself
- `public/js/week-modal.js` — the week popup (Weight/Steps/Measure tabs)
- `public/js/measurements-tab.js` — the Measurements tab widget both the week popup and the Weekly page use
- `public/js/avg-override-panel.js` — the "edit week average" pencil-icon widget
- `public/js/tab-toggle.js` — the generic pill-button tab switcher
- `public/css/modal.css`, `public/css/week-avg-panel.css`, `public/css/measurements.css` — their styling
- `public/index.html` — the `#modalOverlay` section (shared by all of the above)

## Measurements (types + values)
- `public/js/measurements-ui.js` — the data layer: `measurementTypes`, values, add/remove a type
- `public/js/measurements-tab.js` — the field-list widget (see "Shared modal" above)
- `routes/measurement-types.js` — backend: add/remove/list types
- `routes/measurements.js` — backend: get/save/delete values

## Backend API (general)
- `server.js` — mounts every route file under `/api`, serves `public/` statically
- `db.js` — the Postgres connection pool
- `requireLogin.js` — the login-required middleware every data route uses
- `routes/` — one file per REST resource (see sections above for which)

## Database setup
- `setup-db.js` — orchestrator, run manually via `node setup-db.js`
- `setup/create-*-table.js` — one file per table, each a single `CREATE TABLE IF NOT EXISTS`

## Bottom nav / page switching
- `public/js/pages.js` — `showPage()`, wires the 5 nav buttons
- `public/css/base.css` — the `.page-nav` styling (shared/global, not page-specific)

## Date math (used everywhere)
- `public/js/date-utils.js` — `formatDateKey`/`toDateKey`/`sameDay`/`getMondayDate`/`getWeekNumber`/`parseDateKey`/`findMondayForWeekNumber`

## App bootstrap
- `public/js/app.js` — the only `<script>` tag in `index.html`; loads all data once, does the first render of each page, and `import`s everything else the app needs

## Everything else
- `mockups/` — standalone HTML mockups built before real UI changes (see `CLAUDE.md`'s Workflow rules)
- `notes/` — the user's personal learning notes, not part of the app
- `screenshots/` — ad hoc dev screenshots, not part of the app
- `public/assets/` — `background.jpg`, `icon.png`
