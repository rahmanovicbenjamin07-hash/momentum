/**
 * Goals = objective + key results. How far along each kind of key result is
 * (0–100%) and whether it's on track, plus the objective's overall progress.
 * Number key results use forecast.ts for their status; the rest is here.
 */
import { addDays, daysBetween, weekStart, type DateKey, type WeekStartsOn } from './dates'
import type { GoalStatus } from './forecast'

export type KeyResultProgress = {
  /** Whole percent, 0–100. */
  percent: number
  status: GoalStatus
}

/** Floors, so 99.6% isn't shown as 100% before it's reached. */
function toPercent(share: number): number {
  if (!Number.isFinite(share)) return 0
  return Math.max(0, Math.min(100, Math.floor(share * 100 + 1e-9)))
}

// ---------------------------------------------------------------------------
// Number: "€10,000 saved", "€3,000 in a single month"
// ---------------------------------------------------------------------------

/** total: share of the way from the starting point to the target; level: best month ÷ target. */
export function numberPercent({
  type,
  current,
  startValue,
  target,
}: {
  type: 'total' | 'level'
  current: number
  startValue: number
  target: number
}): number {
  if (type === 'level') return toPercent(current / target)
  const span = target - startValue
  return span > 0 ? toPercent((current - startValue) / span) : current >= target ? 100 : 0
}

// ---------------------------------------------------------------------------
// Milestones: a list of steps
// ---------------------------------------------------------------------------

export type MilestoneInput = { id: string; due_date: DateKey | null; done_on: DateKey | null; position: number }

export type MilestoneProgress<M extends MilestoneInput> = KeyResultProgress & {
  done: number
  total: number
  /** Not done and past their due date. */
  overdue: number
  /** The first step still to do (by position), or null when all are done. */
  next: M | null
}

/** Done share this far ahead of the time share counts as "ahead". */
const MILESTONES_AHEAD = 0.25
/** Done share this far behind the time share counts as "slightly behind" (when no step is overdue). */
const MILESTONES_BEHIND = 1 / 3

/**
 * All done → reached. Past the deadline → off track. Then overdue steps:
 * 2+ → behind, 1 → slightly behind. Otherwise the share of steps done is
 * compared with the share of time gone (start → deadline).
 */
export function milestoneProgress<M extends MilestoneInput>({
  milestones,
  startDate,
  deadline,
  today,
}: {
  milestones: readonly M[]
  startDate: DateKey
  deadline: DateKey
  today: DateKey
}): MilestoneProgress<M> {
  const sorted = [...milestones].sort((a, b) => a.position - b.position)
  const total = sorted.length
  const done = sorted.filter((m) => m.done_on !== null).length
  const overdue = sorted.filter((m) => m.done_on === null && m.due_date !== null && m.due_date < today).length
  const next = sorted.find((m) => m.done_on === null) ?? null
  const percent = total > 0 ? toPercent(done / total) : 0
  const base = { done, total, overdue, next, percent }

  if (total > 0 && done === total) return { ...base, status: 'reached' }
  if (today > deadline) return { ...base, status: 'off_track' }
  if (overdue >= 2) return { ...base, status: 'behind' }
  if (overdue === 1) return { ...base, status: 'slightly_behind' }

  const span = daysBetween(startDate, deadline)
  const timeShare = span > 0 ? Math.min(1, Math.max(0, daysBetween(startDate, today) / span)) : 1
  const doneShare = total > 0 ? done / total : 0
  if (total > 0 && doneShare >= timeShare + MILESTONES_AHEAD) return { ...base, status: 'ahead' }
  if (doneShare < timeShare - MILESTONES_BEHIND) return { ...base, status: 'slightly_behind' }
  return { ...base, status: 'on_track' }
}

// ---------------------------------------------------------------------------
// Habit: "gym 3× a week"
// ---------------------------------------------------------------------------

export type HabitWeek = {
  /** First day of the week (Monday by default). */
  start: DateKey
  /** Days ticked in this week (inside the goal's dates). */
  count: number
  /** Times needed this week: the weekly number, or fewer in a first / last week that's cut short. */
  needed: number
  hit: boolean
  /** The week with today in it (still running). */
  current: boolean
}

export type HabitProgress = KeyResultProgress & {
  /** Finished weeks and this week, oldest first (not future weeks). */
  weeks: HabitWeek[]
  thisWeek: HabitWeek | null
  /** Weeks that count so far: finished ones, plus this week once it's hit. */
  weeksCounted: number
  weeksHit: number
  /** Weeks from start to deadline. */
  totalWeeks: number
  /** weeksHit ÷ weeksCounted; null before any week counts. */
  rate: number | null
  /** Hit weeks in a row, up to the latest week that counts. */
  streak: number
}

/** Share of weeks to hit for a habit to count as reached (and on track). */
export const HABIT_SUCCESS_RATE = 0.8

/** Rate → status while the habit is running. A perfect month or more counts as ahead. */
function habitStatus(rate: number | null, weeksCounted: number): GoalStatus {
  if (rate === null) return 'on_track'
  if (rate === 1 && weeksCounted >= 4) return 'ahead'
  if (rate >= HABIT_SUCCESS_RATE) return 'on_track'
  if (rate >= 0.6) return 'slightly_behind'
  if (rate >= 0.4) return 'behind'
  return 'off_track'
}

/**
 * Weeks from start_date to deadline (both included). A week is hit when it has
 * `perWeek` ticks (fewer in a week the dates cut short). This week only counts
 * once it's hit, so an unfinished week never pulls the rate down.
 * percent = hit weeks ÷ all weeks. After the deadline: reached at 80%+ of weeks, else off track.
 */
export function habitProgress({
  perWeek,
  startDate,
  deadline,
  today,
  doneDates,
  weekStartsOn = 1,
}: {
  perWeek: number
  startDate: DateKey
  deadline: DateKey
  today: DateKey
  doneDates: readonly DateKey[]
  weekStartsOn?: WeekStartsOn
}): HabitProgress {
  const ticked = new Set(doneDates.filter((d) => d >= startDate && d <= deadline && d <= today))
  const all: (HabitWeek & { future: boolean })[] = []
  for (let start = weekStart(startDate, weekStartsOn); start <= deadline; start = addDays(start, 7)) {
    const end = addDays(start, 6)
    const from = start < startDate ? startDate : start
    const to = end > deadline ? deadline : end
    const daysInside = daysBetween(from, to) + 1
    let count = 0
    for (let d = from; d <= to; d = addDays(d, 1)) if (ticked.has(d)) count++
    const needed = Math.min(perWeek, daysInside)
    const finished = to < today
    const current = !finished && from <= today
    all.push({ start, count, needed, hit: count >= needed, current, future: !finished && !current })
  }

  const weeks = all.filter((w) => !w.future).map(({ future: _future, ...w }) => w)
  const counted = weeks.filter((w) => !w.current || w.hit)
  const weeksHit = counted.filter((w) => w.hit).length
  const rate = counted.length ? weeksHit / counted.length : null
  let streak = 0
  for (let i = counted.length - 1; i >= 0 && counted[i]?.hit; i--) streak++

  const over = today > deadline
  const status: GoalStatus = over
    ? rate !== null && rate >= HABIT_SUCCESS_RATE
      ? 'reached'
      : 'off_track'
    : habitStatus(rate, counted.length)

  return {
    weeks,
    thisWeek: weeks.find((w) => w.current) ?? null,
    weeksCounted: counted.length,
    weeksHit,
    totalWeeks: all.length,
    rate,
    streak,
    percent: all.length ? toPercent(weeksHit / all.length) : 0,
    status,
  }
}

// ---------------------------------------------------------------------------
// Done / not done: "get the driving licence"
// ---------------------------------------------------------------------------

/** Done → reached (100%). Not done: on track until the deadline, then off track. */
export function doneProgress({
  completedOn,
  deadline,
  today,
}: {
  completedOn: DateKey | null
  deadline: DateKey
  today: DateKey
}): KeyResultProgress {
  if (completedOn) return { percent: 100, status: 'reached' }
  return { percent: 0, status: today > deadline ? 'off_track' : 'on_track' }
}

// ---------------------------------------------------------------------------
// Objective: all its key results together
// ---------------------------------------------------------------------------

/** Worst first. */
const SEVERITY: readonly GoalStatus[] = ['off_track', 'behind', 'slightly_behind', 'on_track', 'ahead', 'reached']

/**
 * percent = average of the key results' percents.
 * status = reached when all are reached, else the worst of the ones not reached;
 * null without key results.
 */
export function objectiveProgress(keyResults: readonly KeyResultProgress[]): {
  percent: number
  status: GoalStatus | null
} {
  if (keyResults.length === 0) return { percent: 0, status: null }
  const percent = Math.floor(keyResults.reduce((sum, kr) => sum + kr.percent, 0) / keyResults.length)
  const open = keyResults.filter((kr) => kr.status !== 'reached')
  if (open.length === 0) return { percent: 100, status: 'reached' }
  const status = SEVERITY.find((s) => open.some((kr) => kr.status === s)) ?? 'on_track'
  return { percent, status }
}
