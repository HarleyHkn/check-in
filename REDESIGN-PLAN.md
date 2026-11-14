# Redesign plan — status snapshot

This file exists so a fresh Claude session (after `/clear`) can pick up exactly
where this one left off, without re-reading the whole chat history. Everything
below is a **decision already made** unless marked "OPEN" / "UNRESOLVED".

All mockups referenced below live in `mockups/*.html` — open them directly in
a browser (`start "" "mockups/<file>.html"`). They are standalone, fully
interactive HTML files, not wired into the real app yet (see "Next step").

## Core concept

- **Weekly check-in, not daily.** All data (weight, steps, measurements,
  photos) is entered once a week, in one sitting. No daily manual entry.
- **Steps** is entered manually for now, but the UI already has a disabled
  "Auto-sync from health tracker — coming soon" note on the Check-in screen,
  so wiring up a real integration later doesn't require a redesign.
- Rebuilt from the old 5-tab layout (Home/Overview/Weekly/Calendar/Photos)
  into **4 destinations + 1 floating action**:
  Overview · Calendar · Graph · Photos, plus a **floating "+" Check-in
  button** centered in the bottom nav (not a 5th tab — it floats above the
  bar with its own shadow, detached, like Instagram's center "+").
- **Overview is the home/landing screen** (not Check-in).

## Page-by-page decisions

### Overview (`overview-concept.html`) — home screen
- Hero card: Avg weight, big number, delta pill vs last check-in, soft
  gradient-wave chart (this chart *style* — a filled, fading area curve — was
  explicitly chosen over two rejected alternatives: a plain line+dots chart,
  and a radial/circular gauge).
- Secondary cards: Avg steps, Streak. **Superseded 2026-11-14** (see
  "RESOLVED — color + icon" below): Streak's icon badge is no longer neutral
  gray, it now matches the same coral accent as Steps. Its sub-text
  ("check-ins in a row") stays plain white though — only Steps' sub-text is
  a green "positive change" pill now.
- Measurements section: **no fill-bar**. A fill bar implies "more filled =
  better," which only makes sense if the goal is always to shrink the number
  — wrong if the user is bulking. Instead: two dots (Start / Now) on a plain
  track + a plain delta number, direction-agnostic.
- Profile icon (top-right) → dropdown → "Log in" opens a **banner-style
  login/signup modal that slides down from the very top of the screen**
  (not a centered dialog), with username/password fields and a Log in/Sign up
  switch link. Logged-in state shows a colored ring on the profile icon so
  it's visible without opening the dropdown.

### Check-in (`checkin-concept.html`) — reached via the floating + button
- One flowing page, not tabs: Weight (big hero-style input) → Steps (input +
  disabled auto-sync note) → Measurements (compact 2-column grid, not a long
  form wall) → Photo (Front shown by default, "+Add Side"/"+Add Back" ghost
  buttons for the rest).
- 4 progress chips (Vikt/Steg/Mått/Foto) in the header show what's already
  filled in, same visual language as Calendar's checkmarks.

### Calendar (`calendar-concept.html`) — history
- **No more day-grid** — it's a list of **weeks**, grouped under month
  headers, since there's no daily data anymore.
- Each week-row: week number + date range + 4 small checkmark dots
  (Vikt/Steg/Mått/Foto). Current/latest week gets a visual glow.
- Tapping a week opens **the same Check-in form** (`calendar-week-checkin-view-concept.html`),
  pre-filled with that week's saved values, not a separate "summary" view —
  deliberately one template for both entering and viewing/editing a week,
  not two.
- Editing an already-saved week requires confirmation: the button reads
  **"Update check-in"**, and clicking it opens a confirm dialog ("Are you
  sure you want to change Week X's check-in?") before anything saves.

### Graph (`graph-concept.html`)
- Weight/Steps toggle pills switch which dataset is charted.
- **Drag to pan** through weeks (not just scrubbing within a fixed window) —
  same direct-manipulation feel as the Photos carousel: content follows the
  finger 1:1, with a slight eased "catch-up" delay via a continuous
  `requestAnimationFrame` lerp loop. Elements are built once and only
  repositioned every frame — recreating DOM nodes every frame was the
  earlier cause of a stutter bug, now fixed everywhere.
- **Current/latest week rests in the CENTER** of the visible window, not the
  right edge. The right half of the chart stays intentionally blank (no
  line) since there's no future data — you can only pan backward from there.
- Only **one** marked dot exists on the curve (the active/headline week),
  not one per data point.
- A faint year label above the chart updates when panning across a year
  boundary (week 52→1 decrements/increments the year).

### Photos (`photos-carousel-concept.html`)
- A 3D "coverflow"-style carousel (CSS 3D transforms, cards arranged around
  an invisible cylinder), not a flat list. Same drag/pan/lerp pattern as
  Graph, same persistent-DOM-elements fix for smoothness.
- Each card shows Front by default; Front/Side/Back pills per card switch
  angle (grayed out if that angle wasn't actually uploaded that week).
  Cards have a subtle reflection underneath (`-webkit-box-reflect`) for a
  "floating" feel.
- **"Compare last vs current"** toggle swaps the carousel for two side-by-side
  cards (LAST / CURRENT) with one shared Front/Side/Back pill row
  controlling both at once.

## Cross-cutting rules

- Profile/login icon + dropdown + banner-login, and the bottom nav with the
  floating "+", are the same on every page.
- Chart style ("soft gradient wave," not line+dots or radial gauge) and
  shape language ("soft/rounded," large border-radius — not the sharp
  F1-style alternative) were both confirmed early and have not changed since.
- **Never use emoji for any icon that needs a specific brand color.** Windows
  renders emoji (👣, 👤, etc.) with its own fixed-color emoji font that
  completely ignores CSS `color`/`fill` — this caused a long, confusing bug
  where icons looked "purple" no matter what CSS was changed. Any icon that
  needs to match the app's accent color must be a hand-built inline SVG using
  `fill="currentColor"`, colored via a CSS `color` property upstream.

## RESOLVED — color + icon (2026-11-14)

Both former OPEN items below are now decided and applied to all six concept
files + `gallery.html`. Documented here in detail because they reverse
earlier rules (see "Cross-cutting rules" history above, which predates this).

1. **Accent color: CORAL, not orange/red-orange.** Picked from the reference
   image `mockups/{73745787-2309-4532-8BD3-EC725992301F}.png` ("the one
   ending in 301F"). Exact spec, as CSS variables in every concept file's
   `:root` (no hardcoded hex in components):
   - `--bg-page:#060609` `--bg-card:#15131D` `--bg-raised:#20202C`
     (`--bg-raised` is specifically for measurement input fields + photo cards)
   - `--text-primary:#FFFFFF` `--text-muted:#8f8aa8` `--text-dim:#65607c`
   - `--accent:#E05438` `--accent-light:#FC8C5C` (graph lines/sparkline/dot)
   - `--accent-fab-start:#E8704C` → `--accent-fab-end:#D4543C` (FAB gradient
     ONLY - every other "active button" like Save/Login/Update/Confirm is a
     solid `--accent` fill, not a gradient)
   - `--accent-deep:#603030` / `--accent-outline:#D05038` (photo silhouettes:
     fill/stroke - no more gray or white silhouettes)
   - **Forbidden** (the old orange/red-orange family): `#E34B1D`, `#F45E28`,
     `#E0481C`, `#F45C28`, `#742C1C`, `#582919`. None of these appear in any
     concept file anymore - verified by grep across all six.
   - Hero card (Overview) and the Graph screen's chart-card both use the same
     warm dark-red linear gradient, `#331D21` top → `#1A151D` bottom - not an
     accent-tinted radial glow like the other cards.
   - Calendar's current/latest week row: faint `#2B1A20` → card-color radial
     tint (was a neutral white glow before).
2. **Steps icon: a real icon, not hand-drawn and not emoji.** Using Phosphor
   Icons' "person-simple-walk" (regular), MIT-licensed, `fill="currentColor"`
   so it follows the accent like the profile icon already does. Two earlier
   hand-drawn SVG attempts (walking-figure shapes built from rotated rects)
   were explicitly rejected - don't go back to drawing one by hand.

**Semantic color reversal - read carefully, this contradicts the OLDER
"no green, direction-neutral" rule above (which is now superseded):**
- Weight-loss and steps-increase deltas (hero delta-pill, checkin/week-view's
  "↓ X kg since/vs ..." text, Overview's steps sub-delta) are now **green**
  (`--positive:#6CD49C` text, `--positive-bg:#2D3331` pill background where a
  pill exists) - framed as "positive change," not direction-neutral white.
- Measurement deltas (Measurements list, e.g. "−8.2 cm") stay **coral**
  (`--accent`), regardless of direction - these did NOT move to green.
- Status chips (Vikt/Steg/Mått/Foto done-state, in Check-in/Calendar/Week-view)
  are now coral for ALL four types when filled - no more "neutral gray" done
  state for Mått/Foto, no per-metric color split for Vikt/Steg either.
- Streak's icon badge also moved from neutral gray to the same coral accent
  as Steps (Streak's sub-text "check-ins in a row" stays plain white though -
  only Steps' sub-text ("420 vs last week") is a green pill).

`mockups/icon-color-options.html` (the comparison/test tool) still has its
OLD multi-palette picker (lila/röd-orange/blå/teal/magenta/guld) - that tool
predates this decision and was never updated to the coral spec. Harmless to
leave as historical scratch work; not one of the six real screens.

## RESOLVED — follow-up polish pass (2026-11-14, same day)

Four small corrections made right after the coral system above went in:

1. **Save/Update check-in button is a gradient, not solid.** First half
   `--accent`, smoothly transitioning to a new `--accent-red:#C2402C` from
   the midpoint onward: `linear-gradient(90deg, var(--accent) 0%,
   var(--accent) 50%, var(--accent-red) 100%)`. Scoped to `.save-button`
   only (checkin + week-view's "Update check-in") - login/confirm/banner
   buttons stayed solid `--accent`, not asked to change.
2. **Reverted the "accent wash on every card" (mini-card/section-card).**
   It made the screens feel "cloudy" per feedback. Per the 301f reference,
   the tint belongs ONLY on: the hero card, the graph's chart-card, and
   Calendar's current-week row. Every other card (mini-cards, section-cards
   in Check-in/Week-view) is back to flat `--bg-card`.
3. **Fixed a real CSS specificity bug**: `.mini-card .sub-delta` (two
   classes) was silently beating `.sub-delta-pill` (one class) regardless of
   source order, so the green "420 vs last week" pill never actually showed
   green text. Fixed by scoping both rules under `.mini-card` so specificity
   matches. While fixing it, gave Streak's "check-ins in a row" a pill too
   (coral, matching its own icon badge - not green, since it isn't a
   weight/steps change value) since it was flagged as having no color either.
4. **Measurements progress-track (Overview) uses `--accent-light`
   (`#FC8C5C`), not `--accent`** - the delta text, the "now" dot, and the
   connector line are all lighter orange now, per feedback. Added
   `--accent-light-rgb: 252, 140, 92` to support this.

## File inventory

**Current / keep** — the only files left in `mockups/`, all fully up to date
with the coral color system + polish passes above:
- `overview-concept.html`, `checkin-concept.html`, `calendar-concept.html`,
  `calendar-week-checkin-view-concept.html`, `photos-carousel-concept.html`,
  `graph-concept.html` — the six real screens.
- `gallery.html` — side-by-side iframe viewer of all six above.

**Archived 2026-11-14** (cleanup pass, once the design was signed off) —
moved to `mockups/old/`, not deleted, so they can still be opened for
reference if needed:
- `old/photos-tab.html`, `old/calendar-photo-indicator.html`,
  `old/home-check-in.html`, `old/measurements-tab.html`,
  `old/weekly-tab.html`, `old/logged-in-username.html` — older mockups from
  before this redesign thread. These were tracked in git history, so they
  were recoverable; moved into `old/` instead of left deleted.

**Permanently lost 2026-11-14** — deleted before the "archive, don't delete"
request came in, and these were never committed to git (confirmed not in
the Windows Recycle Bin either), so there is no way to get them back:
- `icon-and-color-options.html`, `color-picker-tool.html`, `neon-color-preview.html`
  (deleted in an earlier session, already gone before today)
- `icon-color-options.html` (the coral-vs-other-palettes comparison tool
  that led to the final color decision - decision is already ported into
  the six real files, so nothing of substance is lost)
- `layout-redesign.html` (first flat-dashboard attempt, rejected as not "premium" enough)
- `calendar-weekly-concept.html` (Option A/B comparison, superseded by `calendar-concept.html`)
- `calendar-week-detail-concept.html` (week-detail that opened "like Overview" — rejected)
- `design-options.html` (earlier color-exploration attempt, superseded)
- `icon-concepts/` folder (3 PNGs), the three `.jpg` inspiration images, and
  the `{GUID}.png` screenshot — reference material only; the color decision
  itself is safe (it's written out in full in "RESOLVED — color + icon" above).

**Going forward: archive instead of delete.** User asked for this after the
fact - default to moving superseded files into `mockups/old/` rather than
deleting them, unless told otherwise.

## Status: design signed off (2026-11-14)

User reviewed the full six-screen gallery with the final coral color system,
real walking icon, and all polish fixes, and confirmed satisfaction ("Perfekt
nu är jag nöjd"). Mockup phase is done.

## Next step after resuming

Porting this design into the real app (`public/js/*`, `public/css/*`,
`routes/*` where relevant) has NOT started and hasn't been discussed/agreed
yet — ask the user before starting that.
