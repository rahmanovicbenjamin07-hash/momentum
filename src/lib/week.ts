import type { TodayItem } from '@/schemas/today'
import { addDays, DEFAULT_TIME_ZONE, isDateKey, weekDays, weekStart, type DateKey, type WeekStartsOn } from './dates'
import { percentDone, sortTodayItems } from './today-list'
import { buildTodayItems, type TodayCheckInput, type TodayRoutineInput, type TodayTaskInput } from './todayList'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

export type WeekColumn = {
  date: DateKey
  /** Repeating items scheduled that day + one-off tasks due that day, sorted like Today. */
  items: TodayItem[]
  done: number
  total: number
  /** Whole percent, or null when nothing is planned. */
  percent: number | null
  isToday: boolean
  isPast: boolean
  isFuture: boolean
}

export type WeekColumnsInput = {
  /** Any day in the week; the 7 days around it are shown. */
  day: DateKey
  today: DateKey
  timeZone?: string
  weekStartsOn?: WeekStartsOn
  routineItems: readonly TodayRoutineInput[]
  /** Checks covering the 7 days. */
  checks: readonly TodayCheckInput[]
  /** One-off tasks for the 7 days; duplicates are fine. */
  tasks: readonly TodayTaskInput[]
}

/** Week view: one column per day, Monday → Sunday (or Sunday → Saturday). */
export function weekColumns(input: WeekColumnsInput): WeekColumn[] {
  const { today, timeZone = DEFAULT_TIME_ZONE, routineItems, checks } = input
  const tasks = [...new Map(input.tasks.map((t) => [t.id, t])).values()]
  return weekDays(input.day, input.weekStartsOn).map((date) => {
    const items = sortTodayItems(buildTodayItems(routineItems, checks, tasks, date, timeZone))
    const done = items.filter((i) => i.done).length
    return {
      date,
      items,
      done,
      total: items.length,
      percent: items.length ? percentDone(done, items.length) : null,
      isToday: date === today,
      isPast: date < today,
      isFuture: date > today,
    }
  })
}

/**
 * The week a `?start=` value points at: its first day. Anything missing or invalid
 * means the week with today in it.
 */
export function weekFromParam(param: string | null, today: DateKey, weekStartsOn: WeekStartsOn = 1): DateKey {
  return weekStart(param && isDateKey(param) ? param : today, weekStartsOn)
}

/** "2 – 8 Nov 2026", "30 Nov – 6 Dec 2026", "28 Dec 2026 – 3 Jan 2027". */
export function weekRangeLabel(first: DateKey): string {
  const last = addDays(first, 6)
  const [y1, m1, d1] = first.split('-').map(Number) as [number, number, number]
  const [y2, m2, d2] = last.split('-').map(Number) as [number, number, number]
  const end = `${d2} ${MONTHS[m2 - 1]} ${y2}`
  if (y1 !== y2) return `${d1} ${MONTHS[m1 - 1]} ${y1} – ${end}`
  if (m1 !== m2) return `${d1} ${MONTHS[m1 - 1]} – ${end}`
  return `${d1} – ${end}`
}

/** "This week", "Next week", "Last week", or "Week" for any other. `first` is the week's first day. */
export function weekTitle(first: DateKey, today: DateKey, weekStartsOn: WeekStartsOn = 1): string {
  const current = weekStart(today, weekStartsOn)
  if (first === current) return 'This week'
  if (first === addDays(current, 7)) return 'Next week'
  if (first === addDays(current, -7)) return 'Last week'
  return 'Week'
}
