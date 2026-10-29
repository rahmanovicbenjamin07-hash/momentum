import type { Unit } from '@/schemas/stats'
import { addDays } from './dates'
import type { MonthKey } from './metrics'
import { overallRoutineRate } from './routineStats'
import {
  completionRate,
  formatEur,
  formatPercent,
  formatPercent1,
  lowerFirst,
  MIN_SENDS_TO_JUDGE,
  periodCompare,
  type DateRange,
} from './stats'

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

export type ReportPeriod = { kind: 'month'; month: MonthKey } | { kind: 'year'; year: number }

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/** "2026-10" → "October". */
export function monthName(month: MonthKey): string {
  return MONTH_NAMES[Number(month.slice(5, 7)) - 1] ?? month
}

/** "2026-01" → "2025-12". */
export function previousMonth(month: MonthKey): MonthKey {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

/** First and last day of a report period. */
export function reportRange(period: ReportPeriod): DateRange {
  if (period.kind === 'year') return { from: `${period.year}-01-01`, to: `${period.year}-12-31` }
  return { from: `${period.month}-01`, to: addDays(`${nextMonth(period.month)}-01`, -1) }
}

/** "2026-12" → "2027-01". */
export function nextMonth(month: MonthKey): MonthKey {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

/** The period just before (September for October, 2025 for 2026). */
export function previousPeriod(period: ReportPeriod): ReportPeriod {
  return period.kind === 'year'
    ? { kind: 'year', year: period.year - 1 }
    : { kind: 'month', month: previousMonth(period.month) }
}

function labels(period: ReportPeriod) {
  if (period.kind === 'year') {
    return { title: String(period.year), heading: `My ${period.year}`, previous: String(period.year - 1), unit: 'year' }
  }
  const name = monthName(period.month)
  return {
    title: `${name} ${period.month.slice(0, 4)}`,
    heading: `My ${name}`,
    previous: monthName(previousMonth(period.month)),
    unit: 'month',
  }
}

// ---------------------------------------------------------------------------
// Input and output
// ---------------------------------------------------------------------------

/** Totals for one period, worked out by the caller from the database. */
export type ReportNumbers = {
  tasksCompleted: number
  outreachSent: number
  replies: number
  meetings: number
  dealsWon: number
  /** € from won deals. */
  dealsAmount: number
  longestStreak: number
}

export type ReportMetric = {
  name: string
  unit: Unit
  value: number
  previous: number | null
  /** Highest value in any earlier period of the same kind, for "best month yet". */
  bestBefore?: number | null
}

export type ReportRoutineItem = {
  title: string
  done: number
  scheduled: number
  previousDone?: number
  previousScheduled?: number
}

export type ReportInput = {
  current: ReportNumbers
  /** null when there is no earlier data. */
  previous: ReportNumbers | null
  metrics: readonly ReportMetric[]
  routine: readonly ReportRoutineItem[]
  /** Best reply rate in any earlier period, for "your best since you started tracking". */
  bestReplyRateBefore?: number | null
  /** Names of won deals. Shown under "Deals won" only, never on the share card. */
  dealNames?: readonly string[]
}

/** The card meant for sharing: numbers only, no names, contacts or notes. */
export type ShareCard = {
  heading: string
  routinePercent: number | null
  tasksCompleted: number
  longestStreak: number
  /** From the first € metric; null without one. */
  earned: number | null
  outreachSent: number
}

export type KeyNumberUnit = Unit | 'percent'

export type KeyNumber = {
  id: string
  label: string
  unit: KeyNumberUnit
  value: number
  previous: number | null
  delta: number | null
  relative: number | null
  /** Suggested way to show the change: "+13%" (pct) or "+9" (abs). */
  showAs: 'abs' | 'pct'
  /** A second number in the same box ("18 · 7" replies · meetings, "1 · €1,500" deals). */
  extra?: { label: string; unit: KeyNumberUnit; value: number; previous: number | null; delta: number | null }
  /** Small text under the number (deal names). Not part of the share card. */
  detail?: string
}

export type Report = {
  title: string
  /** "September" or "2025": for "vs September". */
  previousLabel: string
  share: ShareCard
  /** Up to 3 sentences. */
  highlights: string[]
  /** Up to 8. */
  keyNumbers: KeyNumber[]
  routine: { overall: number | null; items: { title: string; done: number; scheduled: number; rate: number | null }[] }
}

// ---------------------------------------------------------------------------
// Building the report
// ---------------------------------------------------------------------------

function keyNumber(
  id: string,
  label: string,
  unit: KeyNumberUnit,
  value: number,
  previous: number | null,
): KeyNumber {
  const compare = previous === null ? null : periodCompare(value, previous)
  return {
    id,
    label,
    unit,
    value,
    previous,
    delta: compare?.delta ?? null,
    relative: compare?.relative ?? null,
    showAs: unit === 'eur' ? 'pct' : 'abs',
  }
}

function withExtra(main: KeyNumber, label: string, unit: KeyNumberUnit, value: number, previous: number | null): KeyNumber {
  return { ...main, extra: { label, unit, value, previous, delta: previous === null ? null : value - previous } }
}

function routineRates(items: readonly ReportRoutineItem[]) {
  const current = overallRoutineRate(items)
  const hasPrevious = items.length > 0 && items.every((i) => i.previousScheduled !== undefined)
  const previous = hasPrevious
    ? overallRoutineRate(items.map((i) => ({ done: i.previousDone ?? 0, scheduled: i.previousScheduled ?? 0 })))
    : null
  return { current, previous }
}

/**
 * Up to 8 key numbers in this order: tasks, up to 3 metrics, outreach sent,
 * replies · meetings, deals won, routine %, longest streak.
 */
export function keyNumbers(input: ReportInput): KeyNumber[] {
  const { current: c, previous: p } = input
  const routine = routineRates(input.routine)
  const deals = withExtra(
    keyNumber('deals', 'Deals won', 'count', c.dealsWon, p?.dealsWon ?? null),
    'Won',
    'eur',
    c.dealsAmount,
    p?.dealsAmount ?? null,
  )
  if (input.dealNames?.length) deals.detail = input.dealNames.join(', ')

  const list: KeyNumber[] = [
    keyNumber('tasks', 'Tasks completed', 'count', c.tasksCompleted, p?.tasksCompleted ?? null),
    ...input.metrics
      .slice(0, 3)
      .map((m, i) => keyNumber(`metric-${i}`, m.name, m.unit, m.value, m.previous)),
    keyNumber('outreach', 'Outreach sent', 'count', c.outreachSent, p?.outreachSent ?? null),
    withExtra(
      keyNumber('replies', 'Replies · meetings', 'count', c.replies, p?.replies ?? null),
      'Meetings',
      'count',
      c.meetings,
      p?.meetings ?? null,
    ),
    deals,
  ]
  if (routine.current !== null) list.push(keyNumber('routine', 'Routine done', 'percent', routine.current, routine.previous))
  list.push(keyNumber('streak', 'Longest streak', 'days', c.longestStreak, p?.longestStreak ?? null))
  return list.slice(0, 8)
}

type Candidate = { text: string; score: number; milestone: boolean }

function formatValue(value: number, unit: Unit): string {
  if (unit === 'eur') return formatEur(value)
  if (unit === 'hours') return `${value} h`
  if (unit === 'km') return `${value} km`
  if (unit === 'days') return `${value} days`
  return String(value)
}

function rise(value: number, previous: number | null | undefined): number | null {
  return previous !== null && previous !== undefined && previous > 0 && value > previous ? value / previous - 1 : null
}

/**
 * The 3 highlights: only things that got better. Milestones (a record or a
 * perfect routine month) come first, then the biggest % increases.
 */
export function highlights(input: ReportInput, period: ReportPeriod): string[] {
  const l = labels(period)
  const candidates: Candidate[] = []
  const add = (text: string, score: number, milestone = false) => candidates.push({ text, score, milestone })
  const up = (r: number) => `up ${formatPercent(r)} on ${l.previous}`
  const { current: c, previous: p } = input

  for (const m of input.metrics) {
    const r = rise(m.value, m.previous)
    if (r === null) continue
    const record = m.bestBefore !== null && m.bestBefore !== undefined && m.value > m.bestBefore
    add(
      record
        ? `Best ${l.unit} yet for ${lowerFirst(m.name)}: ${formatValue(m.value, m.unit)}, ${up(r)}.`
        : `${m.name}: ${formatValue(m.value, m.unit)}, ${up(r)}.`,
      r,
      record,
    )
  }

  if (p) {
    const simple: [number, number, (n: number) => string][] = [
      [c.tasksCompleted, p.tasksCompleted, (n) => `You completed ${n} tasks`],
      [c.outreachSent, p.outreachSent, (n) => `You sent ${n} outreach messages`],
      [c.meetings, p.meetings, (n) => `${n} meetings booked`],
      [c.dealsAmount, p.dealsAmount, (n) => `${formatEur(n)} won from deals`],
    ]
    for (const [value, previous, sentence] of simple) {
      const r = rise(value, previous)
      if (r !== null) add(`${sentence(value)}, ${up(r)}.`, r)
    }

    const rate = completionRate(c.replies, c.outreachSent)
    const before = completionRate(p.replies, p.outreachSent)
    const r = rate === null ? null : rise(rate, before)
    if (rate !== null && r !== null && c.outreachSent >= MIN_SENDS_TO_JUDGE) {
      const best = input.bestReplyRateBefore
      const record = best !== null && best !== undefined && rate > best
      add(
        record
          ? `Reply rate climbed to ${formatPercent1(rate)}, your best since you started tracking.`
          : `Reply rate climbed to ${formatPercent1(rate)} from ${formatPercent1(before ?? 0)}.`,
        r,
        record,
      )
    }
  }

  for (const item of input.routine) {
    const rate = completionRate(item.done, item.scheduled)
    const before =
      item.previousScheduled !== undefined ? completionRate(item.previousDone ?? 0, item.previousScheduled) : null
    if (rate === null) continue
    if (rate === 1 && (before === null || before < 1)) {
      add(
        `A perfect ${l.unit} for ${lowerFirst(item.title)} — ${item.done} out of ${item.scheduled} days.`,
        before ? 1 / before - 1 : 0,
        true,
      )
      continue
    }
    const r = rise(rate, before)
    if (r !== null) add(`${item.title}: ${formatPercent(rate)} of days, up from ${formatPercent(before ?? 0)}.`, r)
  }

  return candidates
    .map((cand, order) => ({ ...cand, order }))
    .sort((a, b) => Number(b.milestone) - Number(a.milestone) || b.score - a.score || a.order - b.order)
    .slice(0, 3)
    .map((cand) => cand.text)
}

function buildReport(period: ReportPeriod, input: ReportInput): Report {
  const l = labels(period)
  const routine = routineRates(input.routine)
  const earned = input.metrics.find((m) => m.unit === 'eur')
  return {
    title: l.title,
    previousLabel: l.previous,
    share: {
      heading: l.heading,
      routinePercent: routine.current,
      tasksCompleted: input.current.tasksCompleted,
      longestStreak: input.current.longestStreak,
      earned: earned ? earned.value : null,
      outreachSent: input.current.outreachSent,
    },
    highlights: highlights(input, period),
    keyNumbers: keyNumbers(input),
    routine: {
      overall: routine.current,
      items: input.routine
        .map((i) => ({ title: i.title, done: i.done, scheduled: i.scheduled, rate: completionRate(i.done, i.scheduled) }))
        .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1)),
    },
  }
}

/** Report for one month ("2026-10"), compared with the month before. */
export function monthReport(month: MonthKey, input: ReportInput): Report {
  return buildReport({ kind: 'month', month }, input)
}

/** Report for a year (or the year so far), compared with the year before. */
export function yearReport(year: number, input: ReportInput): Report {
  return buildReport({ kind: 'year', year }, input)
}
