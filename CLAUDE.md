# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal weight/steps/measurements/photos tracking web app, built as a learning project (see `Notes.txt`). Vanilla HTML/CSS/JS front end, no build step and no framework, served by a small Node/Express backend backed by Postgres (Neon). Private GitHub repo: `HarleyHkn/weight-log-app`.

Files must stay under **300 lines** (enforced by a pre-existing hook) — split by concern into a new file rather than growing one past the limit.

The user is a beginner learning both front-end and back-end JS from scratch through this project. See memory: prefer simple, verbose, beginner-readable code over clever/compact code, even if it takes more lines. Explain changes as you go rather than silently refactoring.

## Running it

```
npm install
npm start          # node server.js — serves the app at http://localhost:3000
node setup-db.js   # one-time (or re-runnable) table creation; safe, uses IF NOT EXISTS
```

There is no test suite, build step, or linter configured. `.env` (gitignored) holds `SESSION_SECRET` and `DATABASE_URL` (a Neon Postgres connection string) — required for the server and `setup-db.js` to run.

## Architecture

**Backend (Express, CommonJS, callback/async style, all in the project root):**
- `server.js` — app entry point; wires up `express.json()`, `express-session`, mounts the route modules below under `/api`, then serves the whole project root as static files (`express.static(__dirname)`) so `index.html`/`*.js`/`style.css` are served directly, no bundler.
- `db.js` — creates the shared `pg` `Pool` from `DATABASE_URL`. Notably overrides the Postgres `DATE` type parser to return raw `"YYYY-MM-DD"` strings instead of JS `Date` objects, specifically to avoid a timezone-shift bug that already bit this project once. Also swallows idle-connection pool errors from Neon so they don't crash the server.
- `auth.js` — `POST /api/signup`, `POST /api/login`, `POST /api/logout`, `GET /api/whoami`. Passwords hashed with bcrypt; session-based auth (`req.session.userId`), no JWTs.
- `requireLogin.js` — middleware that 401s if `req.session.userId` is unset. Used on every data route.
- `weights.js`, `steps.js`, `measurements.js`, `photos.js` — REST routes for each metric (`GET`/`POST`/`DELETE` under `/api/weights`, `/api/steps`, `/api/measurements` + `/api/measurement-types`, `/api/photos`). All follow the same shape: every query is scoped to `req.session.userId`, and saves use `INSERT ... ON CONFLICT ... DO UPDATE` (upsert) keyed on a `UNIQUE(user_id, entry_date[, type_name/angle])` constraint. `photos.js` additionally uses `multer` (parses the uploaded file) and `sharp` (auto-rotates, resizes to 800px wide, re-encodes as JPEG) before storing the image as `bytea` directly in Postgres — `GET /api/photos` returns metadata only (which week+angle exist), the actual bytes are served one at a time via `GET /api/photos/:date/:angle`.
- `setup-db.js` — creates `users`, `weights`, `steps`, `measurement_types`, `measurements`, `photos` tables. Each user gets 7 base measurement types (`Chest`, `Left Arm`, `Right Arm`, `Waist`, `Bottom`, `Left Leg`, `Right Leg`) auto-seeded on first read of `/api/measurement-types` (in `measurements.js`, not in `setup-db.js`).

**Frontend (no modules, no bundler — plain `<script>` tags in `index.html`, load order matters):**

All state lives in page-scoped globals populated by `fetch` calls to `/api/...` on load; there is no client-side framework or virtual DOM — screens are re-rendered by directly rebuilding DOM nodes. Five bottom-nav tabs: Home, Overview, Weekly, Calendar, Photos.

Load order from `index.html` (each file depends on globals/functions defined by files before it):
1. `date-utils.js` — pure date helpers (`formatDateKey`/`toDateKey`/`sameDay`/`getMondayDate`/`getWeekNumber`) the whole app depends on.
2. `weights-ui.js` — weight data layer (`weightLog`, `weekAverage`), mirrors `steps-ui.js`.
3. `modal.js` — shared modal/popup plumbing (open/close, `modalMode` state machine) + the single-day popup (still used by the Calendar page's day cells).
4. `avg-override-panel.js` — shared "edit week average" widget (pencil icon → direct input, or overwrite-warning first if the week already has daily entries) — used by the week popup **and** the Weekly page's Weight/Steps tabs.
5. `tab-toggle.js` — generic pill-button tab-switcher DOM helper.
6. `measurements-ui.js` — measurement types + values data layer.
7. `measurements-tab.js` — builds the Measurements field-list (label/input/unit/remove-type rows) — used by the week popup **and** the Weekly page's Measure tab.
8. `week-modal.js` — the week popup itself (Weight/Steps/Measure tabs), opened from the Calendar page's week buttons.
9. `auth-ui.js` — login/signup modal + `isLoggedIn`/`pendingSaveAction` state + `checkLoginStatus()` on load.
10. `steps-ui.js` — steps data layer, same pattern as weight.
11. `photos-ui.js` — photo data layer: `photoList` holds metadata only (never image bytes in JS), `photoUrl()` builds the `<img src>` for on-demand fetching, `uploadPhoto`/`deletePhoto` via `FormData`.
12. `trend-chart.js` — generic reusable inline-SVG line chart widget.
13. `overview.js` — Overview page: week selector + 8-week trend charts.
14. `photos-page.js` — Photos page: week list (current + previous always shown, older weeks reachable via "Add previous"/"Add specific week"), Front/Back/Side filter pills. `parseDateKey`/`findMondayForWeekNumber` here are generic (not photo-specific) and reused by `weekly-page.js`.
15. `weekly-tabs.js` — builds the *content* of each of the Weekly page's 4 toggle tabs (Weight/Steps/Measure/Photo), reusing `buildAvgOverridePanel`/`buildMeasurementsTab`/photo functions above.
16. `weekly-page.js` — Weekly page: assembles `weekly-tabs.js`'s tabs into a card per week with a toggle bar; neon-highlights (`.has-data`) whichever tab already has data, shows a `.week-complete-check` ✓ once all 4 do.
17. `home-page.js` — Home ("Check In") page: Weight/Steps toggle, the Mon–Sun day strip (click a day to select it — the box above edits/deletes *that* day instead of "today", via `selectedHomeDay`), Avg weight/Avg steps tiles.
18. `pages.js` — bottom-nav page switching (`showPage`), calls each page's `render*Page()` on open.
19. `calender.js` — calendar grid + per-week rows; dots per day (weight/steps), neon border on fully-complete weeks, separate teal outline (`.has-photo-entry`) when a week has a photo.
20. `app.js` — bootstrap only: `initPage()` loads every data type once then does each page's first render. Runs **last** (after everything else has defined its functions) — avoid relying on the older "awaits yield to let later scripts load" trick used elsewhere; this file makes that unnecessary going forward.

**Key cross-cutting patterns:**
- **Date handling:** dates are passed around as plain `"YYYY-MM-DD"` strings (`toDateKey`/`formatDateKey`) rather than `Date` objects wherever they cross a save/compare boundary, to dodge UTC-parsing timezone shifts. `new Date("YYYY-MM-DD")` is deliberately avoided; `parseDateKey()` (photos-page.js) is the safe reverse conversion.
- **Login-gated saves:** if a save action fires while logged out, the action itself is stashed in `pendingSaveAction` and the login modal opens; `afterLogin()` replays it. Used throughout (Home's `saveWeight`/`saveSteps`, day/week modal saves).
- **One shared modal:** day popup, week popup, and login/signup all reuse the same `#modalOverlay`/`#modalBody` DOM and the `modalMode` global (`handleModalSave()` in modal.js dispatches by mode).
- **Weekly vs daily entry:** weight/steps are per-day; measurements and photos are per-week, always keyed to that week's Monday (`getMondayDate()`).
- **"Which weeks to show" pattern (Photos + Weekly pages):** current week + N previous weeks always shown (even empty, so there's somewhere to enter data), plus any week that already has data, plus any week added via "Add specific week" (types a week number, resolved to a Monday via `findMondayForWeekNumber`, which just walks forward from Jan 1 until `getWeekNumber()` agrees).
- **The Weekly page duplicates entry surfaces that also exist elsewhere** (weight/steps averages: also settable via the Calendar's week popup; measurements: same field-list widget; photos: same upload/delete) — this is intentional, not drift: Weekly is a single "everything for this week" hub, the others remain as their own dedicated views.

## Workflow rules

- **Clarify before assuming.** If a request is ambiguous or leaves real choices open (scope, format, behavior on edge cases, which files/approach), ask clarifying questions before starting work instead of picking an interpretation and running with it. Don't over-apply this to genuinely unambiguous requests.
- **Mock up UI changes before building them.** For any request that adds or reshapes UI — a new page, component, layout, or visible styling change — build a standalone HTML/CSS mockup using this project's real look and feel (reuse `style.css` colors/classes where practical) **before** writing or editing the actual app code. Save it under `mockups/` in the project root as a full standalone `<!doctype html>` document (not a fragment) and open it in the default browser (`start "" "mockups/<name>.html"` on Windows) so the user can see and click through it immediately. Do **not** use the Artifact tool here — this environment has no claude.ai artifacts panel to view it in. Get the user's sign-off on the mockup, then implement it for real. Skip this step for backend-only work (routes, DB, auth logic, data layer) with no visible-output change, and for trivial one-line tweaks the user already described precisely (e.g. "make this button blue").

## Miscellaneous

- `css.txt`, `cssBasicCommands.txt`, `htmlBasicCommands.txt`, `htmltext.txt`, `indexHTML.txt`, `Notes.txt` are the user's personal learning notes, not part of the app.
- Several loose `{GUID}.png` files and `background.jpg`/`icon.png` in the project root are ad hoc screenshots/assets, not organized into an `assets/` folder yet.
