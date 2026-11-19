# Check In

A web app for tracking your body week by week: weight, average steps,
body measurements and progress photos, all in one weekly check-in.

![Check In walkthrough](docs/check-in-demo.gif)

> **Live demo:** [link added at launch]
> Hosted on a free plan, so the first load can take up to a minute.
> When you're not logged in, the app shows sample data, so you can try it
> without creating an account.

## About

I built Check In to solve a need of my own. I'm into training and nutrition
and wanted one place for my weekly check-ins. It was also a learning project:
a way to understand the building blocks of an app, from the browser to the
database.

The idea started as an iPhone app, but when I looked into publishing it,
getting my own app onto iOS turned out to be costly and complicated, so I
switched to a web app.

The first version had daily entries, but I stopped logging every day, and
entering the data afterwards became tedious. I used to keep weekly notes on
paper, so I rebuilt the app around a weekly check-in.

Before this repo, I wrote a first version by hand to learn the basics.
After that I built it with Claude Code as a coding assistant: the AI wrote
more of the code, while I made the product and design decisions, reviewed
the changes and tested them in the app.

## Features

- Log your weekly weight, steps, body measurements and progress photos
- Follow your progress through graphs and measurement changes
- Compare your latest photos with the week before
- Try it without an account: logged-out visitors see sample data

## Tech stack

- **Front end:** HTML, CSS and vanilla JavaScript (native ES modules, no framework)
- **Back end:** Node.js with Express
- **Database:** PostgreSQL, hosted on Neon
- **Hosting:** Render

I chose PostgreSQL because I had taken a database course and SQL felt
familiar. Vanilla JavaScript and Express kept things as simple as possible,
and Neon and Render are free, so the project costs nothing to run.

## What I learned

After a few months' break I picked the project back up and focused on using
AI effectively, not just letting it write code: I set up rules for how it
should work (`CLAUDE.md`) and a changelog that records each fix
(`CHANGELOG.md`).

If I started again, I would make more of the technical decisions myself,
commit after every finished step, and write tests from the start.

## Getting started

You need Node.js 20 or later and a PostgreSQL database
(Neon's free tier works).

```
git clone https://github.com/HarleyHkn/check-in.git
cd check-in
npm install
```

Create a `.env` file in the project root (see `.env.example`):

```
SESSION_SECRET=any-long-random-string
DATABASE_URL=your-postgres-connection-string
```

Then create the tables and start the app:

```
node setup-db.js
npm start
```

Open http://localhost:3000.

## Roadmap

- Security improvements: keep logins across server restarts, safer cookie
  settings, limits on login attempts and password requirements
- Tests
- Require an email address when creating an account

Changes are logged in `CHANGELOG.md`.
