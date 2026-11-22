# Tempo — Class Reminder & Timetable

A calm, polished web app for your semester: a live "what's now / what's next"
home screen, a full weekly timetable, and a reminders list — all stored
locally in your browser. No account, no backend, no build step.

![Tempo icon](assets/icons/icon-192.png)

## Run it

Any static file server works:

```bash
# Python
python3 -m http.server 8000
# …or Node
npx serve .
```

Then open <http://localhost:8000>.

> Open it via `http://`/`https://` (not `file://`) so ES modules and the
> service worker can load.

## Features

- **Today** — greeting, a live hero card showing the current period with a
  progress ring and per-second countdown (or the next class when you're free),
  today's timeline, up-next classes and due-soon reminders.
- **Timetable** — Mon–Sat week view in list or grid mode, with a "now" line
  in grid view. Click any grid block (or use Settings) to edit periods.
- **Reminders** — tasks with subject, due date/time, priority and notes;
  open / due-today / overdue stats, filters, and one-tap completion.
- **Settings** — your name, light / dark / system theme, class-reminder
  notifications (lead time + test), a full timetable editor, and
  export / import / reset of your data.
- **PWA** — installable, works offline via a service worker, with proper
  icons and theme colours. The pre-loaded timetable is the 5th-semester
  schedule; edit it freely in Settings.

## Design

- Instrument Serif display type paired with Inter for UI text (self-hosted,
  no external requests).
- Warm paper / deep-green palette in light mode, near-black green in dark
  mode; each subject gets its own colour family.
- Desktop sidebar + mobile bottom tab bar, staggered entrance motion, and
  `prefers-reduced-motion` support.

## Tech

Vanilla ES modules, CSS custom properties, `localStorage` persistence
(`tempo.v1`), the Notification API, and a cache-first service worker.
Fonts are Inter (variable) and Instrument Serif, under the SIL Open Font
License (see `assets/fonts/`).

## Layout

```
index.html            app shell
styles/               design tokens + UI stylesheet
js/app.js             hash router & boot
js/store.js           state + localStorage persistence
js/data.js            timetable seed data & subject metadata
js/time.js            schedule / countdown logic
js/notifications.js   reminder scheduler
js/views/             today · week · reminders · settings
assets/               fonts & icons
sw.js                 offline service worker
manifest.webmanifest  PWA manifest
```
