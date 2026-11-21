# CLAUDE.md

Claude rules and regulations to follow for development.

## About the project

Check In is a weekly health tracker: weight, steps, body measurements and
progress photos. I built it to learn full-stack JavaScript:
vanilla HTML/CSS/JS with native ES modules (no framework, no bundler),
a Node/Express API and PostgreSQL (Neon), deployed on Render.

## Commands

```
npm install
node setup-db.js   # creates the tables; safe to re-run
npm start          # runs the app at http://localhost:3000
```

- `.env` must contain `SESSION_SECRET` and `DATABASE_URL`.
- Optional: `API_KEY` and `API_USER_ID` let a script use the API without a
  password (see `apiKey.js`). Never read or write their values.
- There is no test suite, build step or linter yet.

## Code style

- **Readable over clever.** Prefer clear naming & proper code structor instead of smart short cuts. 
- **One file per concern, max 300 lines.** Split instead of growing a file.
- **New comments explain why & how** In short format.

## Workflow

- **Small steps, explained first.** Say what and why before changing anything.

- **Ask, don't assume.** If a request can be read more than one way, ask.

- **Mockup before UI.** New or changed screens start as a standalone HTML
  mockup in `mockups/drafts/` (not committed). Nothing real gets built until
  I approve it. Approved mockups move to `mockups/approved/`.

- **Log changes in `CHANGELOG.md`.** For each change or fix, write in plain words:
  first one simple sentence describing the problem, then on the line below how
  it was solved, then which file(s) were changed, then the date.

- **Comments in English.** All code comments are written in English, even
  when we talk in Swedish.

- **Archive, don't delete.** Move superseded files out of the repo instead
  of deleting them.
