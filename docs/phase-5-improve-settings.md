# Phase 5 — Improvements, Settings, notifications

Design: `design/improve.png`, `design/settings.png`, `design/settings-dark.png`, `design/today-notifications.png` (bell panel).

## Tables (+ RLS)
`reviews` (week_start, wins, misses, lesson, focus, stats_snapshot jsonb), `lessons` (area, text), `experiments` (title, hypothesis, metric, start_date, end_date, status, before_value, during_value, result), `ideas` (text, status), `notification_prefs` (key, enabled, time), `notifications` (kind, title, body, link, read_at).

## Improvements (`/improve`)
Tabs: Weekly review (week picker, auto-filled numbers, 4 text questions, save → status Saved, past reviews), Lessons (area chip, text, date), Experiments (before vs during, status Running/Kept/Dropped), Ideas (status, "Make task", "Test it"). Right column: running experiment with progress, this week's goals, "AI weekly summary" button **disabled with "coming later"** (ask me before adding any paid API).

## Settings (`/settings`)
- Notifications: master switch; per routine item reminder (time); anytime reminder; follow-ups due; close the day 21:00; weekly review Sun 18:00; morning email summary (off); quiet hours 22:00–06:00. Switches use `role="switch"`.
- Appearance: Light / Dark / Match device (dark tokens: page #0B0F17, card #151B26, border #263041, text #F3F4F6, secondary #A3AEC2); week start; day ends at 00:00/02:00/04:00; language (English only for now).
- Data: export CSV, export everything JSON, import CSV; automatic daily backup (Supabase Cron 03:00 → Edge Function writes JSON to a private Storage bucket, keep 30 days) with restore list; delete account (confirm by typing DELETE).
- Integrations: Google Calendar card ("coming later" for now), Gmail "coming later".

## Notifications
- In-app: bell dot + panel (newest first, mark all read, link to settings). Create rows via Supabase Cron for due follow-ups, overdue follow-ups, close the day, weekly review ready.
- Browser notifications (Web Push) only if simple and free; on iPhone they need the site added to the home screen — explain the trade-off before building.

Done when: settings save and apply (dark mode works everywhere), backups run, and notifications appear.
