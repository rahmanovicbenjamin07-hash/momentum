import { addDays, weekStart, type DateKey, type WeekStartsOn } from '@/lib/dates'
import { missedYesterday, todayProgress, weekProgress, type TodayProgress, type WeekProgress } from '@/lib/progress'
import { computeStreak, streakDaysFromTotals, type StreakDay, type StreakResult } from '@/lib/streak'
import { buildTodayItems } from '@/lib/todayList'
import type { RoutineCheck, RoutineItem, Task, TodayItem } from '@/schemas/today'

/**
 * How far back daily totals are loaded for the streak.
 * Longer streaks show as this many days at most.
 */
export const STREAK_LOOKBACK_DAYS = 180

/** Days whose totals (tasks + repeating items) the streak needs: the lookback up to today. */
export function streakRange(today: DateKey): { from: DateKey; to: DateKey } {
  return { from: addDays(today, -(STREAK_LOOKBACK_DAYS - 1)), to: today }
}

/**
 * The one date range of routine checks the page loads: yesterday (for "Yesterday you missed")
 * + the week + the day being viewed + tomorrow (for the "Tomorrow's tasks" card).
 */
export function checksRange(today: DateKey, selected: DateKey, weekStartsOn: WeekStartsOn = 1): { from: DateKey; to: DateKey } {
  const candidates = [addDays(today, -1), weekStart(today, weekStartsOn), selected]
  const from = candidates.reduce((min, d) => (d < min ? d : min))
  const tomorrow = addDays(today, 1)
  const to = selected > tomorrow ? selected : tomorrow
  return { from, to }
}

/** One day's totals from the database (stats_daily_completion), for the streak. */
export type DayTotals = { day: DateKey; total: number; done: number }

export type TodayViewInput = {
  /** The user's real today. */
  today: DateKey
  /** The day being viewed (usually today). */
  selected: DateKey
  timeZone: string
  /** 1 = weeks start on Monday (default), 0 = Sunday. */
  weekStartsOn?: WeekStartsOn
  routineItems: readonly RoutineItem[]
  /** Checks covering checksRange(today, selected). */
  checks: readonly RoutineCheck[]
  /** Tasks for the viewed day, this week and tomorrow; duplicates are fine. */
  tasks: readonly Task[]
  /** Daily totals covering streakRange(today). This week's days are worked out from the loaded lists instead. */
  history: readonly DayTotals[]
}

export type TodayView = {
  /** Items for the viewed day. */
  items: TodayItem[]
  /** Items for the day after the real today ("Tomorrow's tasks"). */
  tomorrowItems: TodayItem[]
  /** All active routine items (for Edit repeating). */
  routineItems: RoutineItem[]
  progress: TodayProgress
  /** Open items (not done, not marked "Not done") for the real today (sidebar badge). */
  openToday: number
  streak: StreakResult
  week: WeekProgress
  missed: { date: DateKey; items: RoutineItem[] }
}

function uniqueById<T extends { id: string }>(rows: readonly T[]): T[] {
  return [...new Map(rows.map((row) => [row.id, row])).values()]
}

export function deriveTodayView(input: TodayViewInput): TodayView {
  const { today, selected, timeZone, routineItems, checks } = input
  const tasks = uniqueById(input.tasks)

  const items = buildTodayItems(routineItems, checks, tasks, selected, timeZone)
  const todayItems = selected === today ? items : buildTodayItems(routineItems, checks, tasks, today, timeZone)
  const tomorrowItems = buildTodayItems(routineItems, checks, tasks, addDays(today, 1), timeZone)
  const week = weekProgress({ routineItems, checks, tasks, today, timeZone, weekStartsOn: input.weekStartsOn })

  // Older days come from the database; this week's days from the loaded lists, so a tick moves the streak at once.
  const streakDays = new Map<DateKey, StreakDay>(streakDaysFromTotals(input.history).map((d) => [d.date, d]))
  for (const d of week.days) {
    if (!d.isFuture) streakDays.set(d.date, { date: d.date, scheduled: d.total, done: d.done })
  }
  const streak = computeStreak([...streakDays.values()], today)

  return {
    items,
    tomorrowItems,
    routineItems: [...routineItems],
    progress: todayProgress(items),
    openToday: todayItems.filter((item) => !item.done && !item.missed).length,
    streak,
    week,
    missed: missedYesterday(routineItems, checks, today, timeZone),
  }
}
