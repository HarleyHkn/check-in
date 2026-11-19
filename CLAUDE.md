# CLAUDE.md

This is the brief I give AI coding assistants (Claude Code) that work in this
repository. It describes the project and the rules I want followed.

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
- There is no test suite, build step or linter yet.

## Code style

- **Readable over clever.** Prefer clear names and plain loops over compact
  tricks, even if it takes more lines.
- **One file per concern, max 300 lines.** Split instead of growing a file.
- **New comments explain why**, not what.

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
