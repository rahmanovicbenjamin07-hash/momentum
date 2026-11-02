import { addDays, weekStart, type DateKey, type WeekStartsOn } from './dates'

/** The first day of the month that contains this day ("2026-10-28" → "2026-10-01"). */
export function monthStart(key: DateKey): DateKey {
  return `${key.slice(0, 8)}01`
}

/** The first day of the month `months` later (or earlier with a negative number). */
export function addMonths(key: DateKey, months: number): DateKey {
  const [y, m] = key.split('-').map(Number) as [number, number]
  const total = y * 12 + (m - 1) + months
  const year = Math.floor(total / 12)
  const month = total - year * 12 + 1
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`
}

/** Same month and year. */
export function sameMonth(a: DateKey, b: DateKey): boolean {
  return a.slice(0, 7) === b.slice(0, 7)
}

/**
 * The 42 days (6 weeks) a month calendar shows, starting on the week's first day,
 * so every month has the same height and fills in days from the months around it.
 */
export function monthGrid(month: DateKey, weekStartsOn: WeekStartsOn = 1): DateKey[] {
  const first = weekStart(monthStart(month), weekStartsOn)
  return Array.from({ length: 42 }, (_, i) => addDays(first, i))
}

/** Keeps a day inside optional min / max bounds (both inclusive). */
export function clampDate(key: DateKey, min?: DateKey, max?: DateKey): DateKey {
  if (min && key < min) return min
  if (max && key > max) return max
  return key
}

/** Moves a day by `months`, keeping the day of the month where it can (31 Jan + 1 → 28 Feb). */
export function shiftMonths(key: DateKey, months: number): DateKey {
  const first = addMonths(key, months)
  const day = Number(key.slice(8, 10))
  const lastDay = Number(addDays(addMonths(first, 1), -1).slice(8, 10))
  return `${first.slice(0, 8)}${String(Math.min(day, lastDay)).padStart(2, '0')}`
}
