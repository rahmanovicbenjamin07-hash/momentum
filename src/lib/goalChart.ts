import type { Unit } from '@/schemas/stats'
import { addDays, daysBetween, formatDate, type DateKey } from './dates'
import { DAYS_PER_MONTH, type MonthValue } from './forecast'

/** One point on the goal chart: a calendar day and the running total on it. */
export type Point = { date: DateKey; value: number }

export type GoalChart = {
  /** Running total at the end of each month from the start, the last one on today. */
  actual: Point[]
  /** Dashed line from today's point (after the pipeline jump) to the finish. Empty without a finish date. */
  forecast: Point[]
  /** Faint line at the real pace, shown only while the slider sets a different pace. */
  ghost: Point[] | null
  /** Open deals added on top of today's value. */
  pipelineJump: { from: number; to: number } | null
  targetY: number
  deadlineX: DateKey
  todayX: DateKey
  finish: Point | null
  /** Right edge: the deadline or the finish date, whichever is later. */
  xMax: DateKey
  /** Top edge: target × 1.1, or the highest point if that's higher. */
  yMax: number
}

export type GoalChartInput = {
  /** Per-month values (not running totals), "YYYY-MM". */
  months: readonly MonthValue[]
  startDate: DateKey
  deadline: DateKey
  today: DateKey
  target: number
  /** Pace used for the forecast (the slider's, or the real one). */
  pace: number
  /** The real pace from the logged months. */
  realPace: number
  /** Expected value of open deals. */
  pipeline: number
  /** When `pace` reaches the target (from totalForecast), or null. */
  finishDate: DateKey | null
}

/** "2026-10" → "2026-10-31". */
function monthEnd(month: string): DateKey {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  return addDays(next, -1)
}

/** "2026-12" → "2027-01". */
function nextMonth(month: string): string {
  return addDays(monthEnd(month), 1).slice(0, 7)
}

/** Days until `remaining` is covered at `pace` a month (rounded), or null without a pace. */
function daysToCover(remaining: number, pace: number): number | null {
  return pace > 0 ? Math.round((remaining / pace) * DAYS_PER_MONTH) : null
}

const later = (a: DateKey, b: DateKey) => (a > b ? a : b)

/** Lines and markers for a total goal's chart (all pure numbers and dates; the UI draws them). */
export function buildGoalChart(input: GoalChartInput): GoalChart {
  const { months, startDate, deadline, today, target, pace, realPace, pipeline, finishDate } = input
  const values = new Map(months.map((m) => [m.month, m.value]))

  // Running total from the start month up to today's month.
  const actual: Point[] = [{ date: startDate, value: 0 }]
  let total = 0
  for (let month = startDate.slice(0, 7); month <= today.slice(0, 7); month = nextMonth(month)) {
    total += values.get(month) ?? 0
    const end = monthEnd(month)
    actual.push({ date: end < today ? end : today, value: total })
  }
  const current = total
  const start = current + Math.max(0, pipeline)
  const pipelineJump = pipeline > 0 ? { from: current, to: start } : null

  const finish = finishDate ? { date: finishDate, value: target } : null
  const forecast = finish ? [{ date: today, value: start }, finish] : []

  // Ghost: where the real pace would go, up to its own finish or the chart's edge.
  let xMax = later(deadline, finishDate ?? deadline)
  let ghost: Point[] | null = null
  if (pace !== realPace) {
    const days = daysToCover(Math.max(0, target - start), realPace)
    const end = days === null ? xMax : addDays(today, days)
    const shownEnd = end < xMax ? end : xMax
    const value = Math.min(target, start + (realPace / DAYS_PER_MONTH) * daysBetween(today, shownEnd))
    ghost = [{ date: today, value: start }, { date: shownEnd, value: realPace > 0 ? value : start }]
    xMax = later(xMax, shownEnd)
  }

  const highest = Math.max(start, ...actual.map((p) => p.value), ...(ghost ?? []).map((p) => p.value))
  return {
    actual,
    forecast,
    ghost,
    pipelineJump,
    targetY: target,
    deadlineX: deadline,
    todayX: today,
    finish,
    xMax,
    yMax: Math.max(target * 1.1, highest),
  }
}

// ---------------------------------------------------------------------------
// Sentences
// ---------------------------------------------------------------------------

const whole = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 })
const oneDecimal = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 1 })

/** "€1,943", "150 h", "320 km", "45 days", "117". */
export function formatGoalValue(value: number, unit: Unit): string {
  switch (unit) {
    case 'eur':
      return `€${whole.format(value)}`
    case 'hours':
      return `${oneDecimal.format(value)} h`
    case 'km':
      return `${oneDecimal.format(value)} km`
    case 'days':
      return `${whole.format(value)} ${Math.round(value) === 1 ? 'day' : 'days'}`
    case 'count':
      return oneDecimal.format(value)
  }
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

/** "2027-03" → "Mar 2027". */
export function formatMonth(month: string): string {
  return `${MONTHS_SHORT[Number(month.slice(5, 7)) - 1] ?? ''} ${month.slice(0, 4)}`
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** "3 days after your deadline", "29 days before your deadline", "right on your deadline". */
function vsDeadline(early: number, unit: 'day' | 'month'): string {
  if (early === 0) return unit === 'day' ? 'right on your deadline' : 'in your deadline month'
  return `${plural(Math.abs(early), unit)} ${early > 0 ? 'before' : 'after'} your deadline`
}

export type ForecastSentenceInput =
  | {
      type: 'total'
      unit: Unit
      target: number
      pace: number
      /** True when the pace comes from the slider. */
      custom?: boolean
      finishDate: DateKey | null
      deadline: DateKey
      reached: boolean
      /** € expected from open deals, already counted in the forecast. */
      pipeline?: number
    }
  | {
      type: 'level'
      unit: Unit
      target: number
      /** Change per month. */
      growth: number
      /** "YYYY-MM" or null. */
      reachMonth: string | null
      deadline: DateKey
      reached: boolean
    }

/** The one-line forecast under a goal's chart. */
export function forecastSentence(input: ForecastSentenceInput): string {
  const fmt = (v: number) => formatGoalValue(v, input.unit)

  if (input.type === 'level') {
    const level = `${fmt(input.target)} a month`
    if (input.reached) return `You've reached ${level}.`
    if (input.growth <= 0 || input.reachMonth === null) {
      return `At your current growth you won't reach ${level} yet — log a few months first.`
    }
    const deadlineMonth = input.deadline.slice(0, 7)
    const monthsEarly =
      (Number(deadlineMonth.slice(0, 4)) - Number(input.reachMonth.slice(0, 4))) * 12 +
      (Number(deadlineMonth.slice(5, 7)) - Number(input.reachMonth.slice(5, 7)))
    return `At your current growth (+${fmt(input.growth)} a month) you'll reach ${level} in ${formatMonth(input.reachMonth)} — ${vsDeadline(monthsEarly, 'month')}.`
  }

  if (input.reached) return `You've reached ${fmt(input.target)}.`
  if (input.pace <= 0 || input.finishDate === null) {
    return `At your current pace you won't reach ${fmt(input.target)} yet — log a few months first.`
  }
  const start = input.custom ? `At ${fmt(input.pace)} a month` : `At your current pace (${fmt(input.pace)} a month)`
  const early = daysBetween(input.finishDate, input.deadline)
  const deals = input.pipeline && input.pipeline > 0 ? `, counting ${formatGoalValue(input.pipeline, 'eur')} expected from open deals` : ''
  return `${start} you'll reach ${fmt(input.target)} on ${formatDate(input.finishDate)} — ${vsDeadline(early, 'day')}${deals}.`
}

/** "To finish by 1 Jan 2027 you need €1,070 a month." */
export function neededSentence({
  unit,
  neededPace,
  deadline,
}: {
  unit: Unit
  /** From totalForecast; null when the deadline has passed. */
  neededPace: number | null
  deadline: DateKey
}): string {
  if (neededPace === null) return `Your deadline (${formatDate(deadline)}) has passed.`
  if (neededPace <= 0) return `You already have enough to finish by ${formatDate(deadline)}.`
  return `To finish by ${formatDate(deadline)} you need ${formatGoalValue(neededPace, unit)} a month.`
}
