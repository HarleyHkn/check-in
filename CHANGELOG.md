# Changelog

Updates and changes done to the code.

## [Unreleased]

### Added
- A script could only save data by logging in with my password.
  Solved: added an optional API key; a request with `Authorization: Bearer <API_KEY>` counts as logged in as `API_USER_ID`.
  Files: `apiKey.js`, `requireLogin.js`, `.env.example`, `README.md`, `CLAUDE.md`
  Added: 2026-11-21
- Links to the app showed no image or description when shared on LinkedIn and in chats.
  Solved: added link-preview (Open Graph) tags and a preview image.
  Files: `public/index.html`, `public/og-image.png`
  Added: 2026-11-19
- The project had no README, so visitors couldn't tell what it was or how to run it.
  Solved: added a README with the background, features, tech stack and setup steps.
  File: `README.md`
  Added: 2026-11-18
- There was no example of the settings the app needs to run.
  Solved: added an example settings file without real values.
  File: `.env.example`
  Added: 2026-11-18
- The README pointed to a demo image that didn't exist yet.
  Solved: added a screenshot of the Overview page, using the built-in demo data.
  File: `docs/screenshots/overview.png`
  Added: 2026-11-19

### Changed
- `npm install` could fail on older Node versions, and the project had no name or description.
  Solved: added a name, version, description and a Node 20+ requirement.
  File: `package.json`
  Changed: 2026-11-18
- The Check-in stylesheet was 408 lines, over the project's 300-line limit.
  Solved: moved the photo row and the save button into their own files. Nothing looks different.
  Files: `public/css/checkin.css`, `public/css/checkin-photo.css`, `public/css/checkin-save.css`, `public/index.html`
  Changed: 2026-11-19
- The lock file still had the project's old name.
  Solved: updated it to match `package.json`.
  File: `package-lock.json`
  Changed: 2026-11-19
- Compare on the Photos page only showed last week next to the latest, so the whole progress wasn't visible.
  Solved: Compare now shows the first photo week next to the latest, with the labels changed to match.
  Files: `public/js/photos-page.js`, `public/index.html`
  Changed: 2026-11-21
- Photos in the carousel and in Compare were cropped, and there was no way to see a photo larger.
  Solved: the photos now show in full, tapping one opens it full screen, and the Compare label says LATEST.
  Files: `public/css/photos.css`, `public/css/photo-viewer.css`, `public/js/photo-viewer.js`, `public/js/photos-carousel.js`, `public/js/photos-page.js`, `public/index.html`
  Changed: 2026-11-21
- The buttons for adding older weeks in Calendar still had the old v1 style, and tapping them seemed to do nothing.
  Solved: replaced them with one "Check in for another week" button in the new style. It opens a box for the week and year, then goes straight to Check-in for that week.
  Files: `public/css/calendar.css`, `public/css/week-picker.css`, `public/js/week-picker.js`, `public/js/calendar.js`, `public/js/auth-ui.js`, `public/js/app.js`, `public/index.html`
  Changed: 2026-11-21

### Fixed
- Showing the whole photo in the Photos carousel and Compare made the photos small, with dark bars around them.
  Solved: the cards fill with the photo again; tapping a photo still shows it whole.
  Files: `public/css/photos.css`, `mockups/approved/photos.html`
  Fixed: 2026-11-21
- In the Photos carousel, the cards sat too low and to the right, so they covered the "Week X of Y" text below.
  Solved: the cards are now centred in the carousel area.
  File: `public/css/photos.css`
  Fixed: 2026-11-21
- Looking up week 53 of a year could return the last week of the year before.
  Solved: the lookup now only accepts a Monday in the year asked for.
  File: `public/js/date-utils.js`
  Fixed: 2026-11-21
- `npm audit` found 5 known security holes in packages the app uses (multer, sharp, body-parser, proxy-addr, qs).
  Solved: ran `npm audit fix`, which updated them to patched minor/patch versions (multer 2.5.0, sharp 0.35.5); `npm audit` now finds 0.
  File: `package-lock.json`
  Fixed: 2026-11-21
- Tapping a week in the Calendar opened Check-in without that week's content, until you swiped away and back.
  Solved: the page is now made visible before it is drawn, so the week-swiper measures its real width instead of 0.
  File: `public/js/checkin-page.js`
  Fixed: 2026-11-21
- Overview showed "No data" when the app opened, until you switched tabs.
  Solved: Overview is now redrawn as soon as the data has loaded.
  File: `public/js/app.js`
  Fixed: 2026-11-18
- On GitHub the README showed the live demo note as one long line, the Overview image was very tall, and the roadmap had a typo.
  Solved: put the live link on its own line, used a one-screen image, and fixed the typo.
  Files: `README.md`, `docs/screenshots/overview.png`
  Fixed: 2026-11-19
