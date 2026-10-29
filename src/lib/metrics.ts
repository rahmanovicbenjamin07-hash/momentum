import type { MetricEntry } from '@/schemas/stats'
import type { DateKey } from './dates'

/** A calendar month as "yyyy-MM". */
export type MonthKey = string

/** One month of a metric: the sum of its entries. */
export type MonthValue = {
  month: MonthKey
  value: number
  /** Notes of that month's entries joined with " · ", or null. */
  note: string | null
  /** How many entries were added up. */
  entries: number
}

// ---------------------------------------------------------------------------
// Month keys
// ---------------------------------------------------------------------------

/** "2026-10-28" → "2026-10". */
export function monthOf(date: DateKey): MonthKey {
  return date.slice(0, 7)
}

/** 2026 for "2026-10". */
export function yearOf(month: MonthKey): number {
  return Number(month.slice(0, 4))
}

/** 1–12 for "yyyy-MM". */
export function monthNumber(month: MonthKey): number {
  return Number(month.slice(5, 7))
}

/** Months since year 0, so two months can be subtracted. */
function monthIndex(month: MonthKey): number {
  return yearOf(month) * 12 + monthNumber(month) - 1
}

/** Removes floating-point noise from sums (0.1 + 0.2 → 0.3). */
function tidy(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

function sum(values: readonly number[]): number {
  return tidy(values.reduce((total, v) => total + v, 0))
}

function average(values: readonly number[]): number {
  return values.length ? sum(values) / values.length : 0
}

// ---------------------------------------------------------------------------
// Grouping and totals
// ---------------------------------------------------------------------------

/**
 * Adds up entries per calendar month (daily and weekly entries become one
 * value per month; a monthly metric has one entry per month anyway).
 * Only months with entries are returned, oldest first.
 */
export function groupByMonth(entries: readonly Pick<MetricEntry, 'entry_date' | 'value' | 'note'>[]): MonthValue[] {
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date))
  const byMonth = new Map<MonthKey, { values: number[]; notes: string[] }>()
  for (const entry of sorted) {
    const month = monthOf(entry.entry_date)
    const group = byMonth.get(month) ?? { values: [], notes: [] }
    group.values.push(entry.value)
    const note = entry.note?.trim()
    if (note) group.notes.push(note)
    byMonth.set(month, group)
  }
  return [...byMonth.entries()].map(([month, { values, notes }]) => ({
    month,
    value: sum(values),
    note: notes.length ? notes.join(' · ') : null,
    entries: values.length,
  }))
}

/** Only the months of one year. */
export function monthsInYear<T extends { month: MonthKey }>(months: readonly T[], year: number): T[] {
  return months.filter((m) => yearOf(m.month) === year)
}

/** Adds a cumulative `total` to each row, in the order given. */
export function runningTotal<T extends { value: number }>(rows: readonly T[]): (T & { total: number })[] {
  let total = 0
  return rows.map((row) => {
    total = tidy(total + row.value)
    return { ...row, total }
  })
}

/**
 * Change of each month vs the previous logged month, as a fraction
 * (0.13 = +13%). null for the first month or when the previous one was 0.
 */
export function changeVsPrevious(months: readonly Pick<MonthValue, 'value'>[]): (number | null)[] {
  return months.map((m, i) => {
    const previous = months[i - 1]
    if (!previous || previous.value === 0) return null
    return m.value / previous.value - 1
  })
}

// ---------------------------------------------------------------------------
// Facts
// ---------------------------------------------------------------------------

/**
 * Average growth per month, compounded from the first to the last month:
 * (last ÷ first)^(1 ÷ months between) − 1. Gaps count as months.
 * null with fewer than 2 months or when the first month is 0.
 */
export function compoundGrowthPerMonth(months: readonly Pick<MonthValue, 'month' | 'value'>[]): number | null {
  const first = months[0]
  const last = months.at(-1)
  if (!first || !last) return null
  const periods = monthIndex(last.month) - monthIndex(first.month)
  if (periods < 1 || first.value <= 0 || last.value < 0) return null
  return (last.value / first.value) ** (1 / periods) - 1
}

export const GROWTH_SHAPES = ['accelerating', 'steady', 'holding', 'slowing'] as const
export type GrowthShape = (typeof GROWTH_SHAPES)[number]
export const GROWTH_SHAPE_LABELS: Record<GrowthShape, string> = {
  accelerating: 'Accelerating',
  steady: 'Steady growth',
  holding: 'Holding steady',
  slowing: 'Slowing down',
}

/**
 * Compares the average month-to-month change (in the metric's unit) of the
 * first half vs the second half of the logged months:
 * - recent change is under 1% of the average month ⇒ holding
 * - recent > 1.2 × earlier and recent > 0 ⇒ accelerating
 * - recent > 0 ⇒ steady
 * - otherwise ⇒ slowing
 * "Holding" is checked first so tiny wiggles aren't called growth.
 * null with fewer than 3 months (needs a change in each half).
 */
export function growthShape(months: readonly Pick<MonthValue, 'value'>[]): GrowthShape | null {
  if (months.length < 3) return null
  const changes = months.slice(1).map((m, i) => m.value - (months[i]?.value ?? 0))
  const split = Math.floor(changes.length / 2)
  const earlier = average(changes.slice(0, split))
  const recent = average(changes.slice(split))
  const mean = average(months.map((m) => m.value))

  if (recent === 0 || Math.abs(recent) < 0.01 * Math.abs(mean)) return 'holding'
  if (recent > 0 && recent > 1.2 * earlier) return 'accelerating'
  if (recent > 0) return 'steady'
  return 'slowing'
}

/** The month with the highest value (the earliest one on a tie). null if nothing is above 0. */
export function bestMonth<T extends Pick<MonthValue, 'value'>>(months: readonly T[]): T | null {
  let best: T | null = null
  for (const m of months) {
    if (m.value > 0 && (!best || m.value > best.value)) best = m
  }
  return best
}

export type YearEndForecast = {
  /** Forecast total on 31 Dec. */
  total: number
  /** Total of the months logged so far. */
  soFar: number
  /** Average of the last (up to) 3 logged months. */
  pace: number
  /** Months left after the last logged one. */
  remainingMonths: number
  /** Dashed forecast line: the last logged month, then one point per remaining month to December. */
  points: { month: MonthKey; total: number }[]
}

/**
 * Where the year ends if the last 3 logged months' pace continues for every
 * month after the last logged one. Pass one year's months, oldest first.
 * null when nothing is logged.
 */
export function yearEndForecast(yearMonths: readonly Pick<MonthValue, 'month' | 'value'>[]): YearEndForecast | null {
  const last = yearMonths.at(-1)
  if (!last) return null
  const soFar = sum(yearMonths.map((m) => m.value))
  const pace = average(yearMonths.slice(-3).map((m) => m.value))
  const year = yearOf(last.month)
  const lastNumber = monthNumber(last.month)
  const remainingMonths = 12 - lastNumber

  const points = [{ month: last.month, total: soFar }]
  for (let k = 1; k <= remainingMonths; k += 1) {
    points.push({ month: `${year}-${String(lastNumber + k).padStart(2, '0')}`, total: tidy(soFar + pace * k) })
  }
  return { total: tidy(soFar + pace * remainingMonths), soFar, pace, remainingMonths, points }
}

/** value ÷ goal as a fraction (0.78 = 78%). null without a goal. */
export function percentOfGoal(value: number, goal: number | null | undefined): number | null {
  return goal && goal > 0 ? value / goal : null
}

export type SameTimeComparison = {
  thisYear: number
  /** Last year's total up to the same month. */
  lastYear: number
  /** Up to and including this month (1–12). */
  throughMonth: number
  /** thisYear ÷ lastYear − 1 (0.71 = +71%). null when last year had nothing. */
  change: number | null
}

/**
 * This year so far vs last year up to the same month. "Same month" is the last
 * logged month this year, unless `throughMonth` (1–12) is given.
 */
export function vsSameTimeLastYear(
  thisYear: readonly Pick<MonthValue, 'month' | 'value'>[],
  lastYear: readonly Pick<MonthValue, 'month' | 'value'>[],
  throughMonth?: number,
): SameTimeComparison {
  const last = thisYear.at(-1)
  const through = throughMonth ?? (last ? monthNumber(last.month) : 12)
  const upTo = (months: typeof thisYear) =>
    sum(months.filter((m) => monthNumber(m.month) <= through).map((m) => m.value))
  const now = upTo(thisYear)
  const before = upTo(lastYear)
  return { thisYear: now, lastYear: before, throughMonth: through, change: before > 0 ? now / before - 1 : null }
}
