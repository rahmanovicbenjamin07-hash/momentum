# Phase 1 — Today page (`/`)

Design: `design/today.png`, `design/today-edit-repeating.png`, `design/streak-levels.png`.

## Tables (+ RLS)
- `routine_items`: title, days boolean[7] (Mon..Sun), time (nullable), position, active.
- `routine_checks`: routine_item_id, date, done, miss_reason (Tired|No time|Travel|Sick|Forgot|Other|null); unique (routine_item_id, date).
- `tasks`: title, notes, due_date, time (nullable), tag, priority (low|medium|high), status (todo|done|dropped), completed_at, position, contact_id (nullable).
- `daily_logs`: date (unique per user), note, energy 1–5.

## Features
- **Top cards:** Today's progress (% done, "Repeating x/y · One-off x/y"), Current streak card, Outreaches this week (x of 20 — use 0 until Phase 2).
- **Quick-add bar:** task text (parse `#tag`, `!high|medium|low`, `HH:MM`), optional time input, Repeat select (Just today / Weekdays / Every day / Weekends). Repeat ≠ Just today ⇒ create a routine item. Enter key submits.
- **Missed yesterday:** if a routine item scheduled yesterday wasn't done, show "Yesterday you missed X" with reason buttons; save to that day's `routine_checks.miss_reason`. Dismissable.
- **One list: "Today's tasks"** shows everything for today — repeating (routine) items scheduled today **and** one-off tasks — in a single component with one progress bar and a done/total count.
  - Repeating items show a chip "Repeating · Mon–Fri" (Every day / Mon–Fri / Weekends / Mon, Wed, Fri) with a repeat icon; one-off items show their tag chip and priority. Both show time or "Anytime".
  - Filter chips with counts: All / Repeating / One-off.
  - **Edit repeating** mode (same card): day toggles M–S, time input (clearable), remove.
  - Sorting: unfinished first, done at the bottom; then by time, anytime last.
- Unfinished one-off tasks from earlier days show in an **Overdue** block above the list: "Move to today" / "Drop".
- **This week** card: week progress % (Mon–today), tasks / routine / outreaches counts, 7-day strip with % per day.
- **Daily note** textarea (autosave) + energy buttons 1–5.
- Ticking is optimistic (instant) with rollback + toast on error.

## Streak (`src/lib/streak.ts` + tests)
A day counts when every routine item scheduled that day is done. One missed day per Mon–Sun week is forgiven. Streak = consecutive counted days ending today or yesterday.

**Streak card component:** white card; left: "Current streak", level badge, number + "days", progress bar, "N days to <next level>"; right: 3-layer flame (outer/middle/core) in a tinted circle.

| Days | Level | Outer / middle / core | Tint | Extra |
| --- | --- | --- | --- | --- |
| 0 | Start | #9CA3AF / #D1D5DB / #F3F4F6 | #F3F4F6 | "Finish today's routine to start one" |
| 1–9 | Spark | #F59E0B / #FBBF24 / #FEF3C7 | #FFFBEB | |
| 10–29 | Flame | #F97316 / #FB923C / #FED7AA | #FFF7ED | |
| 30–59 | Blaze | #E11D48 / #FB7185 / #FFE4E6 | #FFF1F2 | |
| 60–99 | Inferno | #9333EA / #C084FC / #F3E8FF | #FAF5FF | sparkles |
| 100+ | Legend | #2563EB / #60A5FA / #DBEAFE | #EFF6FF | sparkles; next milestones 150, 200, 365… |

The sidebar mini card shows just "Current streak · N days".

Done when: I can add routine items and tasks, tick them, see progress and streak update, and data survives a refresh.
