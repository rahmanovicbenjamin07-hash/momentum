# Phase 4 — Goals (`/goals`)

Design: `design/goals.png`. All maths in `src/lib/forecast.ts` with Vitest tests.

## Table (+ RLS)
`goals`: title, short_label, type (total|level), source_kind (metric|routine), source_id, target, start_date, deadline, include_pipeline.

## Page
- Goal chips in one row (scroll sideways if too many), dot colour = status. "New goal" form: name, measured by (metric or routine item), type, target, deadline.
- Selected goal: source line, title, progress ("€13,950 + €1,910 expected of €18,000"), status pill.
- Money goals: **Count open deals** toggle with chips showing each deal (value × probability).
- Forecast sentence + needed-pace line, e.g. "At your current pace (€1,943 a month) you'll reach €18,000 on 3 Jan 2027 — 3 days after your deadline." / "To finish by 31 Dec 2026 you need €2,025 a month."
- Chart: actual (solid), forecast (dashed) to the finish marker with its date, ghost line of real pace when the slider differs, target line, deadline line, today line, pipeline jump.
- **Slider** under the chart: monthly amount (or monthly growth for level goals), value shown below it ("€2,100 / mo"), green if ≥ needed, amber if not; "My pace" button resets. No other text under the slider.

## Maths
- Total goals: pace = average of the last 3 complete months (slider value replaces it). Finish = now + (target − current) ÷ pace months. Needed = (target − current) ÷ months left.
- Level goals: growth = (last month − month 3 before) ÷ 3; reached in first month where last + growth × k ≥ target.
- Pipeline: deal value × stage probability — proposal 50%, meeting 30%, replied 15%, contacted 5%, new 0%.
- Status: Reached · Ahead (≥ 14 days early) · On track (0–13 early) · Slightly behind (1–21 days late) · Behind (> 21 late) · Off track (pace ≤ 0).

Done when: my goals show correct forecasts and the slider moves the finish date.
