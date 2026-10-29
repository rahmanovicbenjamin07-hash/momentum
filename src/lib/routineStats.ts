import { MISS_REASONS, type MissReason, type RoutineCheck, type RoutineItem } from '@/schemas/today'
import { addDays, dayIndex, daysBetween, DEFAULT_TIME_ZONE, toDateKey, type DateKey } from './dates'
import type { MonthKey } from './metrics'
import { completionRate, tidy, WEEKDAY_NAMES, type DateRange } from './stats'

export type RoutineStatsItem = Pick<RoutineItem, 'id' | 'title' | 'days'> & { created_at?: string }
export type RoutineStatsCheck = Pick<RoutineCheck, 'date' | 'done' | 'miss_reason'>

export const NOT_ANSWERED = 'Not answered'
export type MissReasonLabel = MissReason | typeof NOT_ANSWERED

export type RoutineMonth = {
  month: MonthKey
  /** Scheduled days that already count (past days, and today once ticked or answered). */
  scheduled: number
  done: number
  missed: number
  rate: number | null
  /** Days done so far this year, up to the end of this month. */
  total: number
  /** Scheduled days so far this year, up to the end of this month ("perfect year" line). */
  perfectTotal: number
}

export type RoutineTrend = 'improving' | 'steady' | 'slipping'
export const ROUTINE_TREND_LABELS: Record<RoutineTrend, string> = {
  improving: 'Improving',
  steady: 'Steady',
  slipping: 'Slipping',
}

export type RoutineItemStats = {
  done: number
  scheduled: number
  missed: number
  rate: number | null
  /** January up to the current month (all 12 for a past year). */
  months: RoutineMonth[]
  /** Every scheduled day in the whole year (from when the item was created). */
  perfectYear: number
  /** Cumulative scheduled days per month, Jan–Dec: the dotted "perfect year" line. */
  perfectLine: { month: MonthKey; total: number }[]
  trend: RoutineTrend | null
  bestMonth: RoutineMonth | null
  forecast: {
    /** Expected days done by 31 Dec. */
    total: number
    /** Completion rate of the last 3 months, used for the remaining days. */
    pace: number
    /** Dashed line: the current month, then each month to December. */
    line: { month: MonthKey; total: number }[]
  } | null
  /** The month that contains today, or null when the year isn't the current one. */
  thisMonth: { done: number; scheduled: number } | null
  /** Missed days by reason, most common first; "Not answered" always last. */
  missReasons: { reason: MissReasonLabel; count: number }[]
  /** Weekday with most misses; weekday is null when several tie. null with no misses. */
  missWeekday: { weekday: number | null; misses: number; sentence: string } | null
}

export type RoutineStatsOptions = {
  year: number
  today: DateKey
  timeZone?: string
}

const monthKey = (year: number, month: number): MonthKey => `${year}-${String(month).padStart(2, '0')}`

function createdOn(item: RoutineStatsItem, timeZone: string): DateKey | null {
  return item.created_at ? toDateKey(new Date(item.created_at), timeZone) : null
}

type DayState = 'not-scheduled' | 'done' | 'missed' | 'upcoming'

/**
 * How one day looks for an item. Past scheduled days are done or missed.
 * Today counts only once it's ticked or answered; until then it's upcoming.
 * Inactive items are still counted on their days: pass only the items you want shown.
 */
function dayState(
  item: RoutineStatsItem,
  check: RoutineStatsCheck | undefined,
  date: DateKey,
  today: DateKey,
  created: DateKey | null,
): DayState {
  if (!item.days[dayIndex(date)] || (created && date < created)) return 'not-scheduled'
  if (date > today || (date === today && !check)) return 'upcoming'
  return check?.done ? 'done' : 'missed'
}

function checksByDate(checks: readonly RoutineStatsCheck[]): Map<DateKey, RoutineStatsCheck> {
  return new Map(checks.map((c) => [c.date, c]))
}

/** Done / scheduled for one item between two dates (inclusive), e.g. for a report month. */
export function routineTally(
  item: RoutineStatsItem,
  checks: readonly RoutineStatsCheck[],
  { from, to }: DateRange,
  today: DateKey,
  timeZone: string = DEFAULT_TIME_ZONE,
): { done: number; scheduled: number } {
  const byDate = checksByDate(checks)
  const created = createdOn(item, timeZone)
  let done = 0
  let scheduled = 0
  for (let i = 0; i <= daysBetween(from, to); i += 1) {
    const date = addDays(from, i)
    const state = dayState(item, byDate.get(date), date, today, created)
    if (state === 'done' || state === 'missed') scheduled += 1
    if (state === 'done') done += 1
  }
  return { done, scheduled }
}

function pooled(months: readonly RoutineMonth[]): number | null {
  return completionRate(
    months.reduce((n, m) => n + m.done, 0),
    months.reduce((n, m) => n + m.scheduled, 0),
  )
}

/**
 * Trend from monthly completion: the last 3 months with scheduled days vs the
 * 3 before them. More than 5 points better ⇒ improving, 5 worse ⇒ slipping.
 */
export function routineTrend(months: readonly RoutineMonth[]): RoutineTrend | null {
  const counted = months.filter((m) => m.scheduled > 0)
  const recent = pooled(counted.slice(-3))
  const earlier = pooled(counted.slice(-6, -3))
  if (recent === null || earlier === null) return null
  const diff = recent - earlier
  if (diff > 0.05) return 'improving'
  if (diff < -0.05) return 'slipping'
  return 'steady'
}

/** All year stats for one routine item (the Routine progress tab). */
export function routineItemStats(
  item: RoutineStatsItem,
  checks: readonly RoutineStatsCheck[],
  { year, today, timeZone = DEFAULT_TIME_ZONE }: RoutineStatsOptions,
): RoutineItemStats {
  const byDate = checksByDate(checks)
  const created = createdOn(item, timeZone)
  const jan1 = `${year}-01-01`
  const yearDays = daysBetween(jan1, `${year}-12-31`) + 1
  const todayYear = Number(today.slice(0, 4))
  const lastMonth = todayYear > year ? 12 : todayYear < year ? 0 : Number(today.slice(5, 7))

  const perMonth = Array.from({ length: 12 }, () => ({ scheduled: 0, done: 0, perfect: 0, upcoming: 0 }))
  const reasons = new Map<MissReasonLabel, number>()
  const weekdayMisses = Array.from({ length: 7 }, () => 0)

  for (let i = 0; i < yearDays; i += 1) {
    const date = addDays(jan1, i)
    const check = byDate.get(date)
    const state = dayState(item, check, date, today, created)
    if (state === 'not-scheduled') continue
    const m = perMonth[Number(date.slice(5, 7)) - 1]
    if (!m) continue
    m.perfect += 1
    if (state === 'upcoming') {
      m.upcoming += 1
      continue
    }
    m.scheduled += 1
    if (state === 'done') {
      m.done += 1
    } else {
      const reason: MissReasonLabel = check?.miss_reason ?? NOT_ANSWERED
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1)
      weekdayMisses[dayIndex(date)] = (weekdayMisses[dayIndex(date)] ?? 0) + 1
    }
  }

  // Month rows with running totals.
  let total = 0
  let perfectTotal = 0
  const months: RoutineMonth[] = perMonth.slice(0, lastMonth).map((m, i) => {
    total += m.done
    perfectTotal += m.scheduled
    return {
      month: monthKey(year, i + 1),
      scheduled: m.scheduled,
      done: m.done,
      missed: m.scheduled - m.done,
      rate: completionRate(m.done, m.scheduled),
      total,
      perfectTotal,
    }
  })

  let perfectRunning = 0
  const perfectLine = perMonth.map((m, i) => {
    perfectRunning += m.perfect
    return { month: monthKey(year, i + 1), total: perfectRunning }
  })

  const done = months.reduce((n, m) => n + m.done, 0)
  const scheduled = months.reduce((n, m) => n + m.scheduled, 0)

  return {
    done,
    scheduled,
    missed: scheduled - done,
    rate: completionRate(done, scheduled),
    months,
    perfectYear: perfectRunning,
    perfectLine,
    trend: routineTrend(months),
    bestMonth: bestRoutineMonth(months),
    forecast: forecastFor(months, perMonth, lastMonth, done, year),
    thisMonth:
      todayYear === year
        ? { done: perMonth[lastMonth - 1]?.done ?? 0, scheduled: perMonth[lastMonth - 1]?.scheduled ?? 0 }
        : null,
    missReasons: sortReasons(reasons),
    missWeekday: missWeekdayPattern(weekdayMisses),
  }
}

/** Highest rate; on a tie the month with more days done, then the earlier month. */
export function bestRoutineMonth(months: readonly RoutineMonth[]): RoutineMonth | null {
  let best: RoutineMonth | null = null
  for (const m of months) {
    if (m.rate === null) continue
    if (!best || m.rate > (best.rate ?? -1) || (m.rate === best.rate && m.done > best.done)) best = m
  }
  return best
}

function forecastFor(
  months: readonly RoutineMonth[],
  perMonth: readonly { upcoming: number }[],
  lastMonth: number,
  done: number,
  year: number,
): RoutineItemStats['forecast'] {
  const pace = pooled(months.filter((m) => m.scheduled > 0).slice(-3))
  if (pace === null || lastMonth === 0) return null
  // Upcoming days of the current month land on its point; later months each add theirs.
  let running = done
  const line: { month: MonthKey; total: number }[] = []
  for (let i = lastMonth - 1; i < 12; i += 1) {
    running = tidy(running + (perMonth[i]?.upcoming ?? 0) * pace)
    line.push({ month: monthKey(year, i + 1), total: running })
  }
  return { total: running, pace, line }
}

function sortReasons(reasons: Map<MissReasonLabel, number>): RoutineItemStats['missReasons'] {
  const known = MISS_REASONS.map((reason) => ({ reason: reason as MissReasonLabel, count: reasons.get(reason) ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count) // stable: ties keep the MISS_REASONS order
  const notAnswered = reasons.get(NOT_ANSWERED) ?? 0
  return notAnswered > 0 ? [...known, { reason: NOT_ANSWERED, count: notAnswered }] : known
}

/** "Most misses are on Mondays (6 of 33)." */
export function missWeekdayPattern(weekdayMisses: readonly number[]): RoutineItemStats['missWeekday'] {
  const totalMisses = weekdayMisses.reduce((a, b) => a + b, 0)
  if (totalMisses === 0) return null
  const most = Math.max(...weekdayMisses)
  const top = weekdayMisses.flatMap((n, weekday) => (n === most ? [weekday] : []))
  if (top.length > 1) {
    return { weekday: null, misses: most, sentence: 'Misses are spread across the week — no single day stands out.' }
  }
  const weekday = top[0] ?? 0
  return {
    weekday,
    misses: most,
    sentence: `Most misses are on ${WEEKDAY_NAMES[weekday]}s (${most} of ${totalMisses}).`,
  }
}

/** Done ÷ scheduled across several items (the "94% overall"). */
export function overallRoutineRate(items: readonly { done: number; scheduled: number }[]): number | null {
  return completionRate(
    items.reduce((n, i) => n + i.done, 0),
    items.reduce((n, i) => n + i.scheduled, 0),
  )
}

