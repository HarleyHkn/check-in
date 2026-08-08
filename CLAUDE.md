# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal weight/steps/measurements tracking web app, built as a learning project (see `Notes.txt`). Vanilla HTML/CSS/JS front end, no build step and no framework, served by a small Node/Express backend backed by Postgres (Neon). This is **not** a git repository.

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
- `weights.js`, `steps.js`, `measurements.js` — REST routes for each metric (`GET`/`POST`/`DELETE` under `/api/weights`, `/api/steps`, `/api/measurements` + `/api/measurement-types`). All three follow the same shape: every query is scoped to `req.session.userId` so users can never see or touch each other's rows, and saves use `INSERT ... ON CONFLICT ... DO UPDATE` (upsert) keyed on a `UNIQUE(user_id, entry_date[, type_name])` constraint rather than hand-rolled check-then-insert logic.
- `setup-db.js` — creates `users`, `weights`, `steps`, `measurement_types`, `measurements` tables. Each user gets 7 base measurement types (`Chest`, `Left Arm`, `Right Arm`, `Waist`, `Bottom`, `Left Leg`, `Right Leg`) auto-seeded on first read of `/api/measurement-types` (in `measurements.js`, not in `setup-db.js`) so both new and pre-existing accounts converge on the same starting set.

**Frontend (no modules, no bundler — plain `<script>` tags in `index.html`, load order matters):**

All state lives in page-scoped globals populated by `fetch` calls to `/api/...` on load; there is no client-side framework or virtual DOM — screens are re-rendered by directly rebuilding DOM nodes.

Load order from `index.html` (each file depends on globals/functions defined by files before it):
1. `app.js` — weight data layer (`weightLog`) + date-key helpers (`formatDateKey`/`toDateKey`/`sameDay`) that the rest of the app reuses + the home page's week strip.
2. `modal.js` — shared modal/popup plumbing (open/close, `modalMode` state machine) + the single-day popup.
3. `avg-override-panel.js` — shared "edit week average" widget used inside the week popup.
4. `tab-toggle.js` — generic pill-button tab-switcher DOM helper, reused wherever a popup has multiple tabs.
5. `measurements-ui.js` — measurement types + values data layer (mirrors `app.js`/`steps-ui.js`).
6. `measurements-tab.js` — builds the Measurements tab inside the week popup.
7. `week-modal.js` — the week popup itself (Weight/Steps/Measurements tabs).
8. `auth-ui.js` — login/signup modal (reuses the same popup shell as day/week modals) + `isLoggedIn`/`pendingSaveAction` state + `checkLoginStatus()` on load.
9. `steps-ui.js` — steps data layer, same pattern as weight.
10. `trend-chart.js` — generic reusable inline-SVG line chart widget (gridlines, axis labels, hover tooltip), not tied to weight/steps specifically.
11. `overview.js` — Overview page: week selector + 8-week trend charts for weight/steps/measurements.
12. `pages.js` — bottom-nav page switching (`showPage`) between Home/Overview/Calendar `.page` divs.
13. `calender.js` — calendar grid + per-week rows, dots for days with data, highlights fully-complete weeks.

**Key cross-cutting patterns:**
- **Date handling:** dates are passed around as plain `"YYYY-MM-DD"` strings (`toDateKey`/`formatDateKey` in `app.js`) rather than `Date` objects wherever they cross a save/compare boundary, specifically to dodge UTC-parsing timezone shifts. `new Date("YYYY-MM-DD")` is deliberately avoided for this reason — don't reintroduce it.
- **Login-gated saves:** if a save action fires while logged out, the action itself is stashed in `pendingSaveAction` and the login modal opens; on successful login/signup, `afterLogin()` replays the stashed action. This pattern is used by both `saveWeight` (app.js) and `saveDayModal`/week-modal saves.
- **One shared modal:** day popup, week popup, and login/signup all reuse the same `#modalOverlay`/`#modalBody` DOM and the `modalMode` global to decide which save handler `handleModalSave()` (modal.js) dispatches to — there is only one modal in the DOM, not one per popup type.
- **Weekly vs daily entry:** weight and steps are entered per-day; measurements are entered once per week and always saved against that week's Monday (`getMondayDate()` from `app.js`).

## Workflow rules

- **Clarify before assuming.** If a request is ambiguous or leaves real choices open (scope, format, behavior on edge cases, which files/approach), ask clarifying questions before starting work instead of picking an interpretation and running with it. Don't over-apply this to genuinely unambiguous requests.
- **Mock up UI changes before building them.** For any request that adds or reshapes UI — a new page, component, layout, or visible styling change — build a standalone HTML/CSS mockup using this project's real look and feel (reuse `style.css` colors/classes where practical) **before** writing or editing the actual app code. Save it under `mockups/` in the project root as a full standalone `<!doctype html>` document (not a fragment) and open it in the default browser (`start "" "mockups/<name>.html"` on Windows) so the user can see and click through it immediately. Do **not** use the Artifact tool here — this environment has no claude.ai artifacts panel to view it in. Get the user's sign-off on the mockup, then implement it for real. Skip this step for backend-only work (routes, DB, auth logic, data layer) with no visible-output change, and for trivial one-line tweaks the user already described precisely (e.g. "make this button blue").

## Miscellaneous

- `css.txt`, `cssBasicCommands.txt`, `htmlBasicCommands.txt`, `htmltext.txt`, `indexHTML.txt`, `Notes.txt` are the user's personal learning notes, not part of the app.
- Several loose `{GUID}.png` files and `background.jpg`/`icon.png` in the project root are ad hoc screenshots/assets, not organized into an `assets/` folder yet.
