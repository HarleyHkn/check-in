# Changelog

Updates and changes done to the code.

## [Unreleased]

### Added
- The project had no README, so visitors couldn't tell what it was or how to run it.
  Solved: added a README with the background, features, tech stack and setup steps.
  File: `README.md`
  Added: 2026-11-18
- There was no example of the settings the app needs to run.
  Solved: added an example settings file without real values.
  File: `.env.example`
  Added: 2026-11-18

### Changed
- `npm install` could fail on older Node versions, and the project had no name or description.
  Solved: added a name, version, description and a Node 20+ requirement.
  File: `package.json`
  Changed: 2026-11-18

### Fixed
- Overview showed "No data" when the app opened, until you switched tabs.
  Solved: Overview is now redrawn as soon as the data has loaded.
  File: `public/js/app.js`
  Fixed: 2026-11-18
