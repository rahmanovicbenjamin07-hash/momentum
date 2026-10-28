import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'

/** App-wide default time zone. Later phases read the user's own setting from their profile. */
export const DEFAULT_TIME_ZONE = 'Europe/Sarajevo'

/** "Wednesday, 28 October 2026" — used in page headers. */
export function formatLongDate(date: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  return format(new TZDate(date, timeZone), 'EEEE, d MMMM yyyy')
}

/** "28 Oct 2026" — the standard short date format across the app. */
export function formatShortDate(date: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  return format(new TZDate(date, timeZone), 'd MMM yyyy')
}
