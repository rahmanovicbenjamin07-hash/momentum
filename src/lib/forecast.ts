import { addDays, daysBetween, type DateKey } from './dates'

/** One month of a goal's source, e.g. { month: '2026-10', value: 2200 }. */
export type MonthValue = { month: string; value: number }

/** Average month length in days (365.25 ÷ 12). */
export const DAYS_PER_MONTH = 30.4375

/** How many complete months the pace is averaged over. */
export const PACE_MONTHS = 3

/** How far ahead a level goal looks for its month (5 years). */
export const LEVEL_MAX_MONTHS = 60

function byMonth(months: readonly MonthValue[]): MonthValue[] {
  return [...months].sort((a, b) => a.month.localeCompare(b.month))
}

/** Months since year 0, so two "YYYY-MM" can be subtracted. */
function monthIndex(month: string): number {
  return Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1
}

/** "2026-11" + 2 → "2027-01". */
function addMonths(month: string, count: number): string {
  const index = monthIndex(month) + count
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

/**
 * Average of the last 3 complete months (months before today's month).
 * Fewer if fewer are logged; 0 when none are.
 */
export function recentPace(months: readonly MonthValue[], today: DateKey): number {
  const thisMonth = today.slice(0, 7)
  const complete = byMonth(months)
    .filter((m) => m.month < thisMonth)
    .slice(-PACE_MONTHS)
  return complete.length ? complete.reduce((sum, m) => sum + m.value, 0) / complete.length : 0
}

// ---------------------------------------------------------------------------
// Total goals: "earn €18,000 this year"
// ---------------------------------------------------------------------------

export type TotalForecastInput = {
  months: readonly MonthValue[]
  /** Total so far. */
  current: number
  target: number
  today: DateKey
  deadline: DateKey
  /** Use this pace (per month) instead of the last 3 months. */
  paceOverride?: number
  /** Expected value of open deals (see pipelineExpected), counted as already done. */
  pipeline?: number
}

export type TotalForecast = {
  /** Per month. */
  pace: number
  /** When the target is reached at this pace (today if already reached); null when the pace is 0 or less. */
  finishDate: DateKey | null
  /** Per month still needed to make the deadline; null when the deadline has passed. */
  neededPace: number | null
  /** deadline − finishDate in days (negative = late); null without a finish date. */
  daysEarly: number | null
  reached: boolean
}

export function totalForecast({
  months,
  current,
  target,
  today,
  deadline,
  paceOverride,
  pipeline = 0,
}: TotalForecastInput): TotalForecast {
  const pace = paceOverride ?? recentPace(months, today)
  const value = current + pipeline
  const reached = value >= target
  const remaining = Math.max(0, target - value)

  let finishDate: DateKey | null = null
  if (reached) finishDate = today
  else if (pace > 0) finishDate = addDays(today, Math.round((remaining / pace) * DAYS_PER_MONTH))

  const daysLeft = daysBetween(today, deadline)
  const neededPace = daysLeft > 0 ? remaining / (daysLeft / DAYS_PER_MONTH) : null

  return {
    pace,
    finishDate,
    neededPace,
    daysEarly: finishDate === null ? null : daysBetween(finishDate, deadline),
    reached,
  }
}

// ---------------------------------------------------------------------------
// Level goals: "earn €3,000 in a single month"
// ---------------------------------------------------------------------------

export type LevelForecast = {
  /** Change per month over the last 3 months. */
  growth: number
  /** First month the level should be reached ("YYYY-MM"; the last month if already reached); null if not within 5 years. */
  reachMonth: string | null
  reached: boolean
}

/**
 * growth = (last month − the month 3 before) ÷ 3. With fewer months logged it uses
 * the first month and the real gap. reachMonth = first month (1–60 ahead of the
 * last one) where last + growth × k ≥ target.
 */
export function levelForecast({
  months,
  target,
}: {
  months: readonly MonthValue[]
  target: number
  today: DateKey
}): LevelForecast {
  const sorted = byMonth(months)
  const last = sorted.at(-1)
  if (!last) return { growth: 0, reachMonth: null, reached: false }
  if (last.value >= target) return { growth: growthOf(sorted, last), reachMonth: last.month, reached: true }

  const growth = growthOf(sorted, last)
  if (growth <= 0) return { growth, reachMonth: null, reached: false }
  for (let k = 1; k <= LEVEL_MAX_MONTHS; k += 1) {
    if (last.value + growth * k >= target) return { growth, reachMonth: addMonths(last.month, k), reached: false }
  }
  return { growth, reachMonth: null, reached: false }
}

function growthOf(sorted: readonly MonthValue[], last: MonthValue): number {
  const base = sorted.at(-1 - PACE_MONTHS) ?? sorted[0]
  if (!base) return 0
  const gap = monthIndex(last.month) - monthIndex(base.month)
  return gap > 0 ? (last.value - base.value) / gap : 0
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/** Chance an open deal in this stage turns into money. Other stages (new, won, lost) count 0. */
export const STAGE_PROBABILITY: Readonly<Record<string, number>> = {
  proposal: 0.5,
  meeting: 0.3,
  replied: 0.15,
  contacted: 0.05,
}

export type PipelineItem<D> = D & { probability: number; expected: number }

/** Expected value of open deals: value × stage probability, and their total. */
export function pipelineExpected<D extends { value: number; stage: string }>(
  deals: readonly D[],
): { total: number; items: PipelineItem<D>[] } {
  const items = deals.map((deal) => {
    const probability = STAGE_PROBABILITY[deal.stage] ?? 0
    return { ...deal, probability, expected: deal.value * probability }
  })
  return { total: items.reduce((sum, i) => sum + i.expected, 0), items }
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export const GOAL_STATUSES = ['reached', 'ahead', 'on_track', 'slightly_behind', 'behind', 'off_track'] as const
export type GoalStatus = (typeof GOAL_STATUSES)[number]

/**
 * reached → ahead (finishes 14+ days early) → on track (0–13) →
 * slightly behind (1–21 days late) → behind (22+ late). No pace (≤ 0) ⇒ off track.
 */
export function goalStatus({
  reached,
  daysEarly,
  pace,
}: {
  reached: boolean
  daysEarly: number | null
  pace: number
}): GoalStatus {
  if (reached) return 'reached'
  if (pace <= 0 || daysEarly === null) return 'off_track'
  if (daysEarly >= 14) return 'ahead'
  if (daysEarly >= 0) return 'on_track'
  if (daysEarly >= -21) return 'slightly_behind'
  return 'behind'
}
