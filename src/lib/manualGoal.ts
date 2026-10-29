/**
 * Goals you update by hand ("today I have €4,200"): where the goal stands and
 * how fast it's moving, from the values you typed in.
 */
import { addDays, daysBetween, type DateKey } from './dates'
import { DAYS_PER_MONTH } from './forecast'
import type { Point } from './goalChart'

/** The pace looks back this many days from the latest update (about 3 months). */
export const MANUAL_PACE_DAYS = 91

/** With less history than this, there's no pace yet (a few days would give silly forecasts). */
export const MANUAL_MIN_DAYS = 7

export type ManualUpdate = { date: DateKey; value: number }

export type ManualProgress = {
  /** Latest value, or the starting point with no updates. */
  current: number
  /** Change per month over the last ~3 months of updates; 0 without enough history. */
  pace: number
  /** Start, every update (oldest first), then today at the latest value. */
  points: Point[]
  /** Day of the latest update, or null with none. */
  lastUpdate: DateKey | null
}

/**
 * Updates before the start or after today are ignored.
 * pace = (latest − the value ~3 months before it) ÷ months between them;
 * the "before" point is the newest one at least 91 days older, else the start.
 */
export function manualProgress({
  startDate,
  startValue,
  updates,
  today,
}: {
  startDate: DateKey
  startValue: number
  updates: readonly ManualUpdate[]
  today: DateKey
}): ManualProgress {
  const sorted = updates
    .filter((u) => u.date >= startDate && u.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  const history: Point[] = [{ date: startDate, value: startValue }, ...sorted.map((u) => ({ date: u.date, value: u.value }))]
  const latest = history.at(-1) ?? { date: startDate, value: startValue }

  const cutoff = addDays(latest.date, -MANUAL_PACE_DAYS)
  const base = [...history].reverse().find((p) => p.date <= cutoff) ?? history[0] ?? latest
  const days = daysBetween(base.date, latest.date)
  const pace = sorted.length > 0 && days >= MANUAL_MIN_DAYS ? (latest.value - base.value) / (days / DAYS_PER_MONTH) : 0

  const points = latest.date < today ? [...history, { date: today, value: latest.value }] : history
  return { current: latest.value, pace, points, lastUpdate: sorted.at(-1)?.date ?? null }
}
