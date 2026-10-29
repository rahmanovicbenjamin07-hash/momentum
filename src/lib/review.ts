import type { StatsSnapshot } from '@/schemas/improve'
import { addDays, daysBetween, DEFAULT_TIME_ZONE, toDateKey, type DateKey } from './dates'
import { isScheduledOn, type SchedulableItem } from './todayList'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

function dayMonth(date: DateKey): { day: number; month: string } {
  return { day: Number(date.slice(8, 10)), month: MONTHS_SHORT[Number(date.slice(5, 7)) - 1] ?? '' }
}

/** ISO week number of the week that starts on this Monday (the week of its Thursday). */
export function isoWeek(weekStart: DateKey): number {
  const thursday = addDays(weekStart, 3)
  const dayOfYear = daysBetween(`${thursday.slice(0, 4)}-01-01`, thursday) + 1
  return Math.floor((dayOfYear - 1) / 7) + 1
}

/** "Week 43 · 19–25 Oct", or across months "Week 40 · 28 Sep–4 Oct". */
export function weekLabel(weekStart: DateKey): string {
  const start = dayMonth(weekStart)
  const end = dayMonth(addDays(weekStart, 6))
  const range =
    start.month === end.month ? `${start.day}–${end.day} ${end.month}` : `${start.day} ${start.month}–${end.day} ${end.month}`
  return `Week ${isoWeek(weekStart)} · ${range}`
}

export type WeekNumbersInput = {
  /** Monday of the week. */
  weekStart: DateKey
  tasks: readonly { due_date: DateKey; status: string }[]
  /** Needed to know which routine items were scheduled each day. */
  routineItems: readonly (SchedulableItem & { id: string })[]
  routineChecks: readonly { routine_item_id: string; date: DateKey; done: boolean }[]
  touches: readonly { direction: string; occurred_at: string }[]
  contactsStageHistory: readonly { to_stage: string; changed_at: string }[]
  timeZone?: string
}

/**
 * The week's numbers (Mon–Sun) for the review:
 * task_completion = % of tasks due that week + scheduled routine items that were done (0 with nothing planned);
 * outreach_sent / replies = sent / received touches; meetings = leads moved to "meeting".
 */
export function weekNumbers({
  weekStart,
  tasks,
  routineItems,
  routineChecks,
  touches,
  contactsStageHistory,
  timeZone = DEFAULT_TIME_ZONE,
}: WeekNumbersInput): StatsSnapshot {
  const sunday = addDays(weekStart, 6)
  const inWeek = (day: DateKey) => day >= weekStart && day <= sunday
  const dayOf = (iso: string) => toDateKey(new Date(iso), timeZone)

  const weekTasks = tasks.filter((t) => inWeek(t.due_date) && t.status !== 'dropped')
  let total = weekTasks.length
  let done = weekTasks.filter((t) => t.status === 'done').length

  const doneChecks = new Set(routineChecks.filter((c) => c.done).map((c) => `${c.routine_item_id}|${c.date}`))
  for (let i = 0; i < 7; i += 1) {
    const day = addDays(weekStart, i)
    for (const item of routineItems) {
      if (!isScheduledOn(item, day, timeZone)) continue
      total += 1
      if (doneChecks.has(`${item.id}|${day}`)) done += 1
    }
  }

  const weekTouches = touches.filter((t) => inWeek(dayOf(t.occurred_at)))
  return {
    task_completion: total > 0 ? Math.round((done / total) * 100) : 0,
    outreach_sent: weekTouches.filter((t) => t.direction === 'sent').length,
    replies: weekTouches.filter((t) => t.direction === 'received').length,
    meetings: contactsStageHistory.filter((h) => h.to_stage === 'meeting' && inWeek(dayOf(h.changed_at))).length,
  }
}

/** "Day 10 of 14": where today is inside an experiment (0 before it starts, totalDays after it ends). */
export function experimentProgress(
  exp: { start_date: DateKey; end_date: DateKey },
  today: DateKey,
): { day: number; totalDays: number; pct: number } {
  const totalDays = daysBetween(exp.start_date, exp.end_date) + 1
  const day = Math.min(totalDays, Math.max(0, daysBetween(exp.start_date, today) + 1))
  return { day, totalDays, pct: Math.round((day / totalDays) * 100) }
}

export type ExperimentVerdict = 'better' | 'worse' | 'same'

/**
 * during vs before. changePct is in percent (12.5 = +12.5%), null when before is 0.
 * Under 5% either way counts as "same"; exactly 5% is a real change.
 */
export function experimentResult(
  before: number,
  during: number,
  higherIsBetter = true,
): { change: number; changePct: number | null; verdict: ExperimentVerdict } {
  const change = during - before
  const changePct = before !== 0 ? (change / Math.abs(before)) * 100 : null
  const small = changePct === null ? change === 0 : Math.abs(changePct) < 5
  if (small) return { change, changePct, verdict: 'same' }
  const up = change > 0
  return { change, changePct, verdict: up === higherIsBetter ? 'better' : 'worse' }
}

/** Progress bar towards a weekly target: pct capped at 100; on track once the target is met. */
export function targetProgress(value: number, target: number): { pct: number; onTrack: boolean } {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 100
  return { pct, onTrack: value >= target }
}
