import type { RoutineCheck, TodayItem } from '@/schemas/today'
import { addDays, DEFAULT_TIME_ZONE, weekDays, type DateKey, type WeekStartsOn } from './dates'
import { percentDone } from './today-list'
import {
  buildTodayItems,
  isScheduledOn,
  type TodayCheckInput,
  type TodayRoutineInput,
  type TodayTaskInput,
} from './todayList'

export type Tally = { done: number; total: number }

export type TodayProgress = {
  done: number
  total: number
  /** Whole percent, 0 when there's nothing to do. */
  percent: number
  /** "Repeating x/y" */
  routine: Tally
  /** "One-off x/y" */
  oneOff: Tally
}

/** Top card: "45% · 5 of 11 done · Repeating 3/5 · One-off 2/6". */
export function todayProgress(items: readonly TodayItem[]): TodayProgress {
  const routine: Tally = { done: 0, total: 0 }
  const oneOff: Tally = { done: 0, total: 0 }
  for (const item of items) {
    const tally = item.kind === 'routine' ? routine : oneOff
    tally.total++
    if (item.done) tally.done++
  }
  const done = routine.done + oneOff.done
  const total = routine.total + oneOff.total
  return { done, total, percent: percentDone(done, total), routine, oneOff }
}

export type WeekDayProgress = Tally & {
  date: DateKey
  /** Whole percent, or null for future days and days with nothing to do. */
  percent: number | null
  isToday: boolean
  isFuture: boolean
}

export type WeekProgress = {
  /** Mon → Sun of the current week. */
  days: WeekDayProgress[]
  /** All items (routine + one-off), Mon → today. */
  all: Tally
  routine: Tally
  oneOff: Tally
  /** Week progress % (Mon → today). */
  percent: number
}

export type WeekProgressInput = {
  routineItems: readonly TodayRoutineInput[]
  checks: readonly TodayCheckInput[]
  tasks: readonly TodayTaskInput[]
  today: DateKey
  timeZone?: string
  /** 1 = weeks start on Monday (default), 0 = Sunday. */
  weekStartsOn?: WeekStartsOn
}

/** "This week" card: Mon → today totals and the 7-day strip with % per day. */
export function weekProgress({
  routineItems,
  checks,
  tasks,
  today,
  timeZone = DEFAULT_TIME_ZONE,
  weekStartsOn = 1,
}: WeekProgressInput): WeekProgress {
  const all: Tally = { done: 0, total: 0 }
  const routine: Tally = { done: 0, total: 0 }
  const oneOff: Tally = { done: 0, total: 0 }

  const days = weekDays(today, weekStartsOn).map((date): WeekDayProgress => {
    const isFuture = date > today
    const isToday = date === today
    if (isFuture) return { date, done: 0, total: 0, percent: null, isToday, isFuture }

    const day = todayProgress(buildTodayItems(routineItems, checks, tasks, date, timeZone))
    for (const [sum, part] of [
      [all, day],
      [routine, day.routine],
      [oneOff, day.oneOff],
    ] as const) {
      sum.done += part.done
      sum.total += part.total
    }
    return {
      date,
      done: day.done,
      total: day.total,
      percent: day.total > 0 ? day.percent : null,
      isToday,
      isFuture,
    }
  })

  return { days, all, routine, oneOff, percent: percentDone(all.done, all.total) }
}

export type MissedRoutineInput = TodayRoutineInput
export type MissedCheckInput = Pick<RoutineCheck, 'routine_item_id' | 'date' | 'done' | 'miss_reason'>

export type MissedYesterday<T extends MissedRoutineInput> = {
  date: DateKey
  /** Scheduled yesterday, not done, and no reason given yet. */
  items: T[]
}

/** "Yesterday you missed X": routine items still waiting for a miss reason. */
export function missedYesterday<T extends MissedRoutineInput>(
  routineItems: readonly T[],
  checks: readonly MissedCheckInput[],
  today: DateKey,
  timeZone: string = DEFAULT_TIME_ZONE,
): MissedYesterday<T> {
  const date = addDays(today, -1)
  const byItem = new Map(checks.filter((c) => c.date === date).map((c) => [c.routine_item_id, c]))
  const items = routineItems.filter((item) => {
    if (!isScheduledOn(item, date, timeZone)) return false
    const check = byItem.get(item.id)
    return !check?.done && !check?.miss_reason
  })
  return { date, items }
}
