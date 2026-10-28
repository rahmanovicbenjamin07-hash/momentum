import { addDays, toDateKey, weekStart, type DateKey } from '@/lib/dates'
import { missedYesterday, todayProgress, weekProgress, type TodayProgress, type WeekProgress } from '@/lib/progress'
import { buildStreakDays, computeStreak, type StreakResult } from '@/lib/streak'
import { buildTodayItems } from '@/lib/todayList'
import type { RoutineCheck, RoutineItem, Task, TodayItem } from '@/schemas/today'

/**
 * How far back routine checks are loaded for the streak.
 * Longer streaks show as this many days at most (see the note in the round summary).
 */
export const STREAK_LOOKBACK_DAYS = 180

/** The one date range of routine checks the page loads: streak history + the week + the day being viewed. */
export function checksRange(today: DateKey, selected: DateKey): { from: DateKey; to: DateKey } {
  const candidates = [addDays(today, -(STREAK_LOOKBACK_DAYS - 1)), weekStart(today), selected]
  const from = candidates.reduce((min, d) => (d < min ? d : min))
  const to = selected > today ? selected : today
  return { from, to }
}

export type TodayViewInput = {
  /** The user's real today. */
  today: DateKey
  /** The day being viewed (usually today). */
  selected: DateKey
  timeZone: string
  routineItems: readonly RoutineItem[]
  /** Checks covering checksRange(today, selected). */
  checks: readonly RoutineCheck[]
  checksFrom: DateKey
  /** Tasks for the viewed day and this week; duplicates are fine. */
  tasks: readonly Task[]
}

export type TodayView = {
  /** Items for the viewed day. */
  items: TodayItem[]
  /** All active routine items (for Edit repeating). */
  routineItems: RoutineItem[]
  progress: TodayProgress
  /** Unfinished items for the real today (sidebar badge). */
  openToday: number
  streak: StreakResult
  week: WeekProgress
  missed: { date: DateKey; items: RoutineItem[] }
  /** Yesterday was this week's forgiven miss, so the streak goes on. */
  streakSafe: boolean
}

function uniqueById<T extends { id: string }>(rows: readonly T[]): T[] {
  return [...new Map(rows.map((row) => [row.id, row])).values()]
}

export function deriveTodayView(input: TodayViewInput): TodayView {
  const { today, selected, timeZone, routineItems, checks, checksFrom } = input
  const tasks = uniqueById(input.tasks)

  const items = buildTodayItems(routineItems, checks, tasks, selected, timeZone)
  const todayItems = selected === today ? items : buildTodayItems(routineItems, checks, tasks, today, timeZone)

  const streakItems = routineItems.map((item) => ({
    id: item.id,
    days: item.days,
    active: item.active,
    createdOn: toDateKey(new Date(item.created_at), timeZone),
  }))
  // Days before the loaded window have no checks; leave them out instead of counting them as missed.
  const streakDays = buildStreakDays(streakItems, checks, today).filter((day) => day.date >= checksFrom)
  const streak = computeStreak(streakDays, today)

  const missed = missedYesterday(routineItems, checks, today, timeZone)

  return {
    items,
    routineItems: [...routineItems],
    progress: todayProgress(items),
    openToday: todayItems.filter((item) => !item.done).length,
    streak,
    week: weekProgress({ routineItems, checks, tasks, today, timeZone }),
    missed,
    streakSafe: streak.forgivenDates.includes(missed.date),
  }
}
