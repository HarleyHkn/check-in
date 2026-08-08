# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal weight/steps/measurements/photos tracking web app, built as a learning project (see `notes/Notes.txt`). Vanilla HTML/CSS/JS front end (using native ES modules, no bundler), served by a small Node/Express backend backed by Postgres (Neon). Private GitHub repo: `HarleyHkn/weight-log-app`.

Files must stay under **300 lines** (enforced by a pre-existing hook) — split by concern into a new file rather than growing one past the limit. See `FILE-MAP.md` for a "what do I open for X" lookup table across the whole project.

The user is a beginner learning both front-end and back-end JS from scratch through this project. See memory: prefer simple, verbose, beginner-readable code over clever/compact code, even if it takes more lines. Explain changes as you go rather than silently refactoring.

## Running it

```
npm install
npm start          # node server.js — serves the app at http://localhost:3000
node setup-db.js   # one-time (or re-runnable) table creation; safe, uses IF NOT EXISTS
```

There is no test suite, build step, or linter configured. `.env` (gitignored) holds `SESSION_SECRET` and `DATABASE_URL` (a Neon Postgres connection string) — required for the server and `setup-db.js` to run.

## Architecture

**Folder layout:**
```
public/          everything the browser loads (served via express.static)
  index.html
  css/            10 files, one per page/component + base.css for shared styles
  js/             20 files, one per page/component, ES modules
  assets/         background.jpg, icon.png
routes/           backend route files (one per REST resource)
setup/            one file per CREATE TABLE, called by setup-db.js
notes/            personal learning notes (not part of the app)
screenshots/      ad hoc dev screenshots (not part of the app)
mockups/          UI mockups built before implementing real changes (see Workflow rules)
db.js, requireLogin.js, server.js, setup-db.js   at the project root (npm/dotenv expect
                                                  package.json/.env there too, so nothing
                                                  browser- or route-specific lives at root)
```

**Backend (Express, CommonJS, callback/async style):**
- `server.js` — app entry point; wires up `express.json()`, `express-session`, mounts the route modules below under `/api`, then serves `public/` as static files (`express.static(path.join(__dirname, 'public'))`) so `index.html`/`js/*.js`/`css/*.css` are served directly, no bundler. Only `public/` is exposed over HTTP — `server.js`, `db.js`, etc. are not.
- `db.js` — creates the shared `pg` `Pool` from `DATABASE_URL`. Notably overrides the Postgres `DATE` type parser to return raw `"YYYY-MM-DD"` strings instead of JS `Date` objects, specifically to avoid a timezone-shift bug that already bit this project once. Also swallows idle-connection pool errors from Neon so they don't crash the server.
- `requireLogin.js` — middleware that 401s if `req.session.userId` is unset. Used on every data route.
- `routes/auth.js` — `POST /api/signup`, `POST /api/login`, `POST /api/logout`, `GET /api/whoami`. Passwords hashed with bcrypt; session-based auth (`req.session.userId`), no JWTs.
- `routes/weights.js`, `routes/steps.js`, `routes/measurement-types.js`, `routes/measurements.js`, `routes/photos.js` — REST routes for each metric (`GET`/`POST`/`DELETE` under `/api/weights`, `/api/steps`, `/api/measurement-types`, `/api/measurements`, `/api/photos`). Measurement *types* (the list of what's tracked) and *values* (day-by-day numbers) are two separate route files/tables. All follow the same shape: every query is scoped to `req.session.userId`, and saves use `INSERT ... ON CONFLICT ... DO UPDATE` (upsert) keyed on a `UNIQUE(user_id, entry_date[, type_name/angle])` constraint — this upsert/get/delete pattern repeats near-verbatim across all four files by choice, not oversight (see each file's comments), to keep every route's real SQL visible in that one file rather than behind a shared helper. `routes/photos.js` additionally uses `multer` (parses the uploaded file) and `sharp` (auto-rotates, resizes to 800px wide, re-encodes as JPEG) before storing the image as `bytea` directly in Postgres — `GET /api/photos` returns metadata only (which week+angle exist), the actual bytes are served one at a time via `GET /api/photos/:date/:angle`.
- `setup-db.js` — thin orchestrator; calls each `setup/create-*-table.js` in order, then closes the pool. Each user gets 7 base measurement types (`Chest`, `Left Arm`, `Right Arm`, `Waist`, `Bottom`, `Left Leg`, `Right Leg`) auto-seeded on first read of `/api/measurement-types` (in `routes/measurement-types.js`, not in `setup/`).

**Frontend (ES modules, no bundler):**

`public/index.html` has exactly one `<script type="module" src="js/app.js">` — `app.js` `import`s everything else it needs, and the browser follows those imports automatically (no manual script-tag ordering, unlike the old plain-`<script>` setup). All state lives in module-level variables populated by `fetch` calls to `/api/...` on load; there is no client-side framework or virtual DOM — screens are re-rendered by directly rebuilding DOM nodes. Five bottom-nav tabs: Home, Overview, Weekly, Calendar, Photos.

Each `public/js/*.js` file matches one page or concern (mirroring the old flat `<script>` list, just with `import`/`export` now instead of implicit globals):
- `date-utils.js` — pure date helpers (`formatDateKey`/`toDateKey`/`sameDay`/`getMondayDate`/`getWeekNumber`/`parseDateKey`/`findMondayForWeekNumber`) the whole app depends on.
- `weights-ui.js` — weight data layer (`weightLog`, `weekAverage`), mirrors `steps-ui.js`.
- `modal.js` — shared modal/popup plumbing (open/close, `modalState.mode` state machine) + the single-day popup (still used by the Calendar page's day cells).
- `avg-override-panel.js` — shared "edit week average" widget (pencil icon → direct input, or overwrite-warning first if the week already has daily entries) — used by the week popup **and** the Weekly page's Weight/Steps tabs.
- `tab-toggle.js` — generic pill-button tab-switcher DOM helper.
- `measurements-ui.js` — measurement types + values data layer.
- `measurements-tab.js` — builds the Measurements field-list (label/input/unit/remove-type rows) — used by the week popup **and** the Weekly page's Measure tab.
- `week-modal.js` — the week popup itself (Weight/Steps/Measure tabs), opened from the Calendar page's week buttons.
- `auth-ui.js` — login/signup modal + `authState` (`isLoggedIn`/`pendingSaveAction`) + `checkLoginStatus()` on load.
- `steps-ui.js` — steps data layer, same pattern as weight.
- `photos-ui.js` — photo data layer: `photoList` holds metadata only (never image bytes in JS), `photoUrl()` builds the `<img src>` for on-demand fetching, `uploadPhoto`/`deletePhoto` via `FormData`.
- `trend-chart.js` — generic reusable inline-SVG line chart widgets (`buildTrendChart` single-series, `buildMultiTrendChart` multi-series).
- `overview.js` — Overview page: week selector + 8-week trend charts.
- `photos-page.js` — Photos page: week list (current + previous always shown, older weeks reachable via "Add previous"/"Add specific week"), Front/Back/Side filter pills.
- `weekly-tabs.js` — builds the *content* of each of the Weekly page's 4 toggle tabs (Weight/Steps/Measure/Photo), reusing `buildAvgOverridePanel`/`buildMeasurementsTab`/photo functions above.
- `weekly-page.js` — Weekly page: assembles `weekly-tabs.js`'s tabs into a card per week with a toggle bar; neon-highlights (`.has-data`) whichever tab already has data, shows a `.week-complete-check` ✓ once all 4 do.
- `home-page.js` — Home ("Check In") page: Weight/Steps toggle, the Mon–Sun day strip (click a day to select it — the box above edits/deletes *that* day instead of "today", via `selectedHomeDay`), Avg weight/Avg steps tiles.
- `pages.js` — bottom-nav page switching (`showPage`), calls each page's `render*Page()` on open.
- `calender.js` — calendar grid + per-week rows; dots per day (weight/steps), neon border on fully-complete weeks, separate teal outline (`.has-photo-entry`) when a week has a photo.
- `app.js` — bootstrap only: `initPage()` loads every data type once then does each page's first render, plus the entry point's `import`s that pull in every other file (see the file's own header comment for which imports exist purely for their side effects, like registering a page's button listeners).

`public/css/` mirrors the same one-file-per-page/component split; `base.css` holds the reset plus any class used by 2+ pages (see that file's own comments for exactly which).

**Key cross-cutting patterns:**
- **Date handling:** dates are passed around as plain `"YYYY-MM-DD"` strings (`toDateKey`/`formatDateKey`) rather than `Date` objects wherever they cross a save/compare boundary, to dodge UTC-parsing timezone shifts. `new Date("YYYY-MM-DD")` is deliberately avoided; `parseDateKey()` (date-utils.js) is the safe reverse conversion.
- **Login-gated saves:** if a save action fires while logged out, the action itself is stashed in `authState.pendingSaveAction` and the login modal opens; `afterLogin()` replays it. Used throughout (Home's `saveWeight`/`saveSteps`, day/week modal saves).
- **One shared modal:** day popup, week popup, and login/signup all reuse the same `#modalOverlay`/`#modalBody` DOM and the `modalState.mode` value (`handleModalSave()` in modal.js dispatches by mode). `authState` and `modalState` are exported as objects (not plain `let` variables) specifically so other files can change a property on them — an ES module can only reassign a value from inside the file that exports it, but any file can mutate a property of an object it imports.
- **Weekly vs daily entry:** weight/steps are per-day; measurements and photos are per-week, always keyed to that week's Monday (`getMondayDate()`).
- **"Which weeks to show" pattern (Photos + Weekly pages):** current week + N previous weeks always shown (even empty, so there's somewhere to enter data), plus any week that already has data, plus any week added via "Add specific week" (types a week number, resolved to a Monday via `findMondayForWeekNumber`, which just walks forward from Jan 1 until `getWeekNumber()` agrees).
- **The Weekly page duplicates entry surfaces that also exist elsewhere** (weight/steps averages: also settable via the Calendar's week popup; measurements: same field-list widget; photos: same upload/delete) — this is intentional, not drift: Weekly is a single "everything for this week" hub, the others remain as their own dedicated views.

## Workflow rules

- **Clarify before assuming.** If a request is ambiguous or leaves real choices open (scope, format, behavior on edge cases, which files/approach), ask clarifying questions before starting work instead of picking an interpretation and running with it. Don't over-apply this to genuinely unambiguous requests.
- **Mock up UI changes before building them.** For any request that adds or reshapes UI — a new page, component, layout, or visible styling change — build a standalone HTML/CSS mockup using this project's real look and feel (reuse `public/css/` colors/classes where practical) **before** writing or editing the actual app code. Save it under `mockups/` in the project root as a full standalone `<!doctype html>` document (not a fragment) and open it in the default browser (`start "" "mockups/<name>.html"` on Windows) so the user can see and click through it immediately. Do **not** use the Artifact tool here — this environment has no claude.ai artifacts panel to view it in. Get the user's sign-off on the mockup, then implement it for real. Skip this step for backend-only work (routes, DB, auth logic, data layer) with no visible-output change, and for trivial one-line tweaks the user already described precisely (e.g. "make this button blue").

## Miscellaneous

- `notes/` holds the user's personal learning notes (`css.txt`, `cssBasicCommands.txt`, `htmlBasicCommands.txt`, `htmltext.txt`, `indexHTML.txt`, `Notes.txt`) — not part of the app.
- `screenshots/` holds ad hoc dev screenshots — not part of the app.
- `public/assets/` holds `background.jpg` and `icon.png` (the latter isn't currently referenced by any code).
