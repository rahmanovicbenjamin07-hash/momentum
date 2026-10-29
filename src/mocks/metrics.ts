import type { MetricCardData } from '@/components/metrics/MetricCards'
import type { MetricFact } from '@/components/metrics/MetricFacts'
import type { ChartMonth, LastYearMonth } from '@/components/metrics/MetricChart'
import { formatChange, formatMetricValue, monthName, monthShort } from '@/components/metrics/format'
import {
  bestMonth,
  changeVsPrevious,
  compoundGrowthPerMonth,
  GROWTH_SHAPE_LABELS,
  growthShape,
  percentOfGoal,
  runningTotal,
  vsSameTimeLastYear,
  yearEndForecast,
  type MonthKey,
  type MonthValue,
} from '@/lib/metrics'

/**
 * Mock data from design/progress.png: "Money earned" 2026 (Jan–Oct logged), compared
 * with 2025. The facts are worked out with src/lib/metrics, the same way the page will.
 */

export const MOCK_METRICS_YEAR = 2026
export const MOCK_CURRENT_MONTH: MonthKey = '2026-10'

const month = (year: number, m: number, value: number, note: string | null = null): MonthValue => ({
  month: `${year}-${String(m).padStart(2, '0')}`,
  value,
  note,
  entries: 1,
})

const MONEY_2026: MonthValue[] = [
  month(2026, 1, 850),
  month(2026, 2, 920),
  month(2026, 3, 1100),
  month(2026, 4, 980),
  month(2026, 5, 1350, 'Raised hourly rate'),
  month(2026, 6, 1500),
  month(2026, 7, 1420),
  month(2026, 8, 1680, 'Fitbox Gym project'),
  month(2026, 9, 1950),
  month(2026, 10, 2200, '2 new clients'),
]

const MONEY_2025: MonthValue[] = [560, 600, 640, 680, 720, 760, 800, 1060, 1280, 1050, 1100, 1300].map((v, i) =>
  month(2025, i + 1, v),
)

const GOAL = 18_000

const changes = changeVsPrevious(MONEY_2026)
export const mockMoneyMonths: ChartMonth[] = runningTotal(MONEY_2026).map((m, i) => ({
  month: m.month,
  value: m.value,
  total: m.total,
  change: changes[i] ?? null,
  note: m.note,
}))

export const mockMoneyLastYear: LastYearMonth[] = runningTotal(MONEY_2025).map(({ month: key, value, total }) => ({
  month: key,
  value,
  total,
}))

const forecast = yearEndForecast(MONEY_2026)
export const mockMoneyForecast = forecast?.points ?? null
export const mockMoneyGoal = GOAL

const vsLastYear = vsSameTimeLastYear(MONEY_2026, MONEY_2025)
const growth = compoundGrowthPerMonth(MONEY_2026)
const shape = growthShape(MONEY_2026)
const best = bestMonth(MONEY_2026)
const eur = (v: number) => formatMetricValue(v, 'eur')
const forecastShare = forecast ? percentOfGoal(forecast.total, GOAL) : null

export const mockMoneyFacts: MetricFact[] = [
  { label: `${MOCK_METRICS_YEAR} so far`, value: eur(vsLastYear.thisYear), detail: `${MONEY_2026.length} months logged` },
  {
    label: `Vs same time ${MOCK_METRICS_YEAR - 1}`,
    value: vsLastYear.change === null ? '—' : formatChange(vsLastYear.change),
    detail: `${MOCK_METRICS_YEAR - 1} had ${eur(vsLastYear.lastYear)}`,
    tone: vsLastYear.change === null ? 'neutral' : vsLastYear.change >= 0 ? 'good' : 'bad',
  },
  {
    label: 'Average growth per month',
    value: growth === null ? '—' : formatChange(growth),
    detail: `From ${monthShort(MONEY_2026[0]!.month)} to ${monthShort(MONEY_2026.at(-1)!.month)}`,
    tone: growth === null ? 'neutral' : growth >= 0 ? 'good' : 'bad',
  },
  {
    label: 'Growth shape',
    value: shape ? GROWTH_SHAPE_LABELS[shape] : '—',
    detail: shape === 'accelerating' ? 'Growing faster in recent months' : undefined,
    tone: shape === 'accelerating' || shape === 'steady' ? 'good' : shape === 'slowing' ? 'bad' : 'neutral',
  },
  {
    label: 'Best month',
    value: best ? `${monthShort(best.month)} · ${eur(best.value)}` : '—',
    detail: best?.note ?? undefined,
  },
  {
    label: 'Year-end forecast',
    value: forecast ? `≈ ${eur(Math.round(forecast.total))}` : '—',
    detail: forecastShare === null ? undefined : `${Math.round(forecastShare * 100)}% of the ${eur(GOAL)} goal`,
    tone: forecastShare !== null && forecastShare < 1 ? 'warn' : 'good',
  },
]

export const mockMetricCards: MetricCardData[] = [
  {
    id: 'm-money',
    name: 'Money earned',
    unit: 'eur',
    logEvery: 'monthly',
    total: vsLastYear.thisYear,
    change: vsLastYear.change,
    lastYear: 2025,
    goal: GOAL,
    goalShare: percentOfGoal(vsLastYear.thisYear, GOAL),
  },
  { id: 'm-trainings', name: 'Trainings', unit: 'count', logEvery: 'weekly', total: 117, change: 0.5, lastYear: 2025, goal: 150, goalShare: 0.78 },
  { id: 'm-hours', name: 'Hours worked', unit: 'hours', logEvery: 'weekly', total: 1371, change: 0.22, lastYear: 2025, goal: 1700, goalShare: 0.81 },
]

/** Months the Log a value form offers: this year up to now, newest first. */
export const mockLogMonths: MonthKey[] = Array.from({ length: 10 }, (_, i) => `2026-${String(10 - i).padStart(2, '0')}`)

export const mockExisting: Record<MonthKey, { value: number; note: string | null }> = Object.fromEntries(
  MONEY_2026.filter((m) => m.month !== MOCK_CURRENT_MONTH).map((m) => [m.month, { value: m.value, note: m.note }]),
)

/** For the /dev caption. */
export const mockCurrentMonthName = monthName(MOCK_CURRENT_MONTH)
