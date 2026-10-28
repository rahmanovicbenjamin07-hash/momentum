import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'

/** App-wide default time zone. The user's own setting comes from their profile. */
export const DEFAULT_TIME_ZONE = 'Europe/Sarajevo'

/**
 * A calendar day as "yyyy-MM-dd" (same format as a Postgres `date`).
 * Calendar maths below works on these strings in UTC, so it never shifts with
 * time zones or daylight-saving changes.
 */
export type DateKey = string

const DAY_MS = 24 * 60 * 60 * 1000
const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** True for a real calendar day like "2026-10-28" (rejects "2026-02-30"). */
export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string') return false
  const match = DATE_KEY_RE.exec(value)
  if (!match) return false
  const [, y, m, d] = match.map(Number) as [number, number, number, number]
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

function keyToUtcMs(key: DateKey): number {
  if (!isDateKey(key)) throw new RangeError(`Invalid date key: "${key}"`)
  return Date.parse(`${key}T00:00:00Z`)
}

function utcMsToKey(ms: number): DateKey {
  return new Date(ms).toISOString().slice(0, 10)
}

/** The calendar day an instant falls on in a time zone. */
export function toDateKey(date: Date, timeZone: string = DEFAULT_TIME_ZONE): DateKey {
  return format(new TZDate(date, timeZone), 'yyyy-MM-dd')
}

export type TodayOptions = {
  /** Defaults to the current time. */
  now?: Date
  timeZone?: string
  /** Hour (0–23) when the day ends. With 3, 01:30 still counts as the previous day. */
  dayEndHour?: number
}

/** The user's "today" as a DateKey, respecting their time zone and day_end_hour. */
export function getToday({ now = new Date(), timeZone = DEFAULT_TIME_ZONE, dayEndHour = 0 }: TodayOptions = {}): DateKey {
  if (!Number.isInteger(dayEndHour) || dayEndHour < 0 || dayEndHour > 23) {
    throw new RangeError(`dayEndHour must be an integer 0–23, got ${dayEndHour}`)
  }
  const key = toDateKey(now, timeZone)
  const localHour = new TZDate(now, timeZone).getHours()
  return localHour < dayEndHour ? addDays(key, -1) : key
}

/** Moves a calendar day forward (or back with a negative number). */
export function addDays(key: DateKey, days: number): DateKey {
  return utcMsToKey(keyToUtcMs(key) + days * DAY_MS)
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((keyToUtcMs(to) - keyToUtcMs(from)) / DAY_MS)
}

/** Weekday index with the week starting Monday: Mon = 0 … Sun = 6. */
export function dayIndex(key: DateKey): number {
  const sundayFirst = new Date(keyToUtcMs(key)).getUTCDay() // Sun = 0
  return (sundayFirst + 6) % 7
}

/** The Monday of the week that contains this day. */
export function weekStart(key: DateKey): DateKey {
  return addDays(key, -dayIndex(key))
}

/** All 7 days (Mon → Sun) of the week that contains this day. */
export function weekDays(key: DateKey): DateKey[] {
  const monday = weekStart(key)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** A DateKey as a local Date at midnight, only for passing to date-fns `format`. */
function keyToLocalDate(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number]
  keyToUtcMs(key) // validates
  return new Date(y, m - 1, d)
}

function formatIn(date: Date | DateKey, pattern: string, timeZone: string): string {
  return typeof date === 'string' ? format(keyToLocalDate(date), pattern) : format(new TZDate(date, timeZone), pattern)
}

/**
 * "28 Oct 2026", the standard short date across the app.
 * A Date is shown in the given time zone; a DateKey is shown as-is.
 */
export function formatDate(date: Date | DateKey, timeZone: string = DEFAULT_TIME_ZONE): string {
  return formatIn(date, 'd MMM yyyy', timeZone)
}

/** "Wednesday, 28 October 2026", used in page headers. */
export function formatLongDate(date: Date | DateKey, timeZone: string = DEFAULT_TIME_ZONE): string {
  return formatIn(date, 'EEEE, d MMMM yyyy', timeZone)
}
