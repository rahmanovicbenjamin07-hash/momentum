# Phase 3 — Stats (`/stats`: Overview, My metrics, Routine progress, Reports)

Design: `design/stats.png`, `design/progress.png` (My metrics), `design/progress-routine.png` (Routine progress), `design/reports.png`. Compute in SQL views/functions (security_invoker) and `src/lib/stats.ts` (tested).

## Tables (+ RLS)
- `metrics`: name, unit (eur|count|hours|km|days), log_every (daily|weekly|monthly), yearly_goal.
- `metric_entries`: metric_id, entry_date, value, note, contact_id (nullable — set when it came from a won deal). Seed "Money earned", "Trainings", "Hours worked". Hook up Phase 2's won-deal flow.

## Overview tab
Range 7/30/90 days. KPIs: task completion %, tasks done, streak, outreach sent, reply rate, meetings (each with change vs previous period). Line: completion per day + 7-day average. 12-week heatmap. Outreach funnel (contacted → replied → meeting → proposal → won, % of previous). Reply rate by source and by channel (bars faded if < 30 sends). Insights (4 computed sentences: completion on days the "wake up" routine was done vs not; best weekday for replies; timed vs anytime task completion; outreach on energy 1–2 days vs average). Revenue from outreach (won amounts by source/channel/template). Templates table (sent, replies, rate). Completed tasks by tag.

## My metrics tab
Metric cards (total, % vs same time last year, goal bar) + "New metric" (name, unit, how often, optional yearly goal). Chart for the selected metric:
- **Running total:** cumulative line, dashed forecast to December at last-3-months pace, last year's cumulative line, goal line.
- **Per month:** bars, last-year dots, goal pace line (goal ÷ 12).
- Hover a month: value, running total, change vs previous month, last year, note.
Facts: year so far · vs same time last year · average growth per month (compound, first→last month) · growth shape · best month · year-end forecast (+ % of goal).
**Growth shape:** compare average monthly change first half vs second half: second > 1.2 × first and > 0 ⇒ Accelerating; > 0 ⇒ Steady growth; |change| < 1% of mean ⇒ Holding steady; else Slowing down.
"Log a value" form (month, value, note) + entries table (month, value, change, running total, note). Weekly/daily entries are grouped by month.

## Routine progress tab
Cards per routine item (rate, days done, missed). Chart: days done cumulative vs "perfect year" (every scheduled day). Facts: done, rate, trend, best month, forecast, this month. **Why you missed it:** bars by miss_reason + "Not answered", plus one pattern sentence (weekday with most misses). Month-by-month table.

## Reports tab
Month / Year toggle. Shareable summary card (no names or contacts), 3 highlights (biggest positive changes), 8 key numbers vs previous period, routine % per item, goal statuses (after Phase 4), lessons. "Download PDF" (print stylesheet) and "Share image" (export the card as PNG).

Done when: stats show real numbers from my data and I can log metric values.
