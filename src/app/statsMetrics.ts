/**
 * Stats → My metrics: one metric's entries → cards, chart, facts and form props.
 * Pure (tested in statsMetrics.test.ts); the maths lives in src/lib/metrics.
 */
import type { MetricRow } from '@/api/metrics'
import type { MetricCardData } from '@/components/metrics/MetricCards'
import type { ChartMonth, LastYearMonth } from '@/components/metrics/MetricChart'
import type { MetricFact } from '@/components/metrics/MetricFacts'
import { formatChange, formatMetricValue, monthShort } from '@/components/metrics/format'
import type { DateKey } from '@/lib/dates'
import {
  bestMonth,
  changeVsPrevious,
  compoundGrowthPerMonth,
  GROWTH_SHAPE_LABELS,
  groupByMonth,
  growthShape,
  monthsInYear,
  percentOfGoal,
  runningTotal,
  vsSameTimeLastYear,
  yearEndForecast,
  type MonthKey,
  type MonthValue,
} from '@/lib/metrics'
import type { MetricEntry } from '@/schemas/stats'

/** This year's and last year's months of one metric. */
export function metricYears(entries: readonly MetricEntry[], year: number): { thisYear: MonthValue[]; lastYear: MonthValue[] } {
  const months = groupByMonth(entries)
  return { thisYear: monthsInYear(months, year), lastYear: monthsInYear(months, year - 1) }
}

/** The month "same time last year" is counted to: today's month in the current year, else December. */
export function throughMonth(year: number, today: DateKey): number {
  return Number(today.slice(0, 4)) === year ? Number(today.slice(5, 7)) : 12
}

export function metricCard(metric: MetricRow, entries: readonly MetricEntry[], year: number, today: DateKey): MetricCardData {
  const { thisYear, lastYear } = metricYears(entries, year)
  const vs = vsSameTimeLastYear(thisYear, lastYear, throughMonth(year, today))
  return {
    id: metric.id,
    name: metric.name,
    unit: metric.unit,
    logEvery: metric.log_every,
    total: vs.thisYear,
    change: vs.change,
    lastYear: year - 1,
    goal: metric.yearly_goal,
    goalShare: percentOfGoal(vs.thisYear, metric.yearly_goal),
  }
}

export type MetricView = {
  months: ChartMonth[]
  lastYear: LastYearMonth[]
  forecast: { month: MonthKey; total: number }[] | null
  facts: MetricFact[]
  /** Values already logged this year, for the Log a value form. */
  existing: Record<MonthKey, { value: number; note: string | null }>
}

/** Everything the chart, facts, form and entries table need for one metric and year. */
export function metricView(metric: MetricRow, entries: readonly MetricEntry[], year: number, today: DateKey): MetricView {
  const { thisYear, lastYear } = metricYears(entries, year)
  const changes = changeVsPrevious(thisYear)
  const months: ChartMonth[] = runningTotal(thisYear).map((m, i) => ({
    month: m.month,
    value: m.value,
    total: m.total,
    change: changes[i] ?? null,
    note: m.note,
  }))
  const isCurrentYear = Number(today.slice(0, 4)) === year
  const forecast = isCurrentYear ? yearEndForecast(thisYear) : null
  const fmt = (v: number) => formatMetricValue(v, metric.unit)
  const goal = metric.yearly_goal
  const vs = vsSameTimeLastYear(thisYear, lastYear, throughMonth(year, today))
  const growth = compoundGrowthPerMonth(thisYear)
  const shape = growthShape(thisYear)
  const best = bestMonth(thisYear)
  const forecastShare = forecast ? percentOfGoal(forecast.total, goal) : null
  const first = thisYear[0]
  const last = thisYear.at(-1)
  const logged = thisYear.length

  const facts: MetricFact[] = [
    {
      label: isCurrentYear ? `${year} so far` : String(year),
      value: fmt(vs.thisYear),
      detail: `${logged} ${logged === 1 ? 'month' : 'months'} logged`,
    },
    {
      label: `Vs same time ${year - 1}`,
      value: vs.change === null ? '—' : formatChange(vs.change),
      detail: vs.lastYear > 0 ? `${year - 1} had ${fmt(vs.lastYear)}` : `Nothing logged in ${year - 1}`,
      tone: vs.change === null ? 'neutral' : vs.change >= 0 ? 'good' : 'bad',
    },
    {
      label: 'Average growth per month',
      value: growth === null ? '—' : formatChange(growth),
      detail: first && last && growth !== null ? `From ${monthShort(first.month)} to ${monthShort(last.month)}` : 'Needs 2 months',
      tone: growth === null ? 'neutral' : growth >= 0 ? 'good' : 'bad',
    },
    {
      label: 'Growth shape',
      value: shape ? GROWTH_SHAPE_LABELS[shape] : '—',
      detail: shape === 'accelerating' ? 'Growing faster in recent months' : shape === null ? 'Needs 3 months' : undefined,
      tone: shape === 'accelerating' || shape === 'steady' ? 'good' : shape === 'slowing' ? 'bad' : 'neutral',
    },
    {
      label: 'Best month',
      value: best ? `${monthShort(best.month)} · ${fmt(best.value)}` : '—',
      detail: best?.note ?? undefined,
    },
    {
      label: 'Year-end forecast',
      value: forecast ? `≈ ${fmt(Math.round(forecast.total))}` : '—',
      detail:
        forecastShare !== null && goal !== null
          ? `${Math.round(forecastShare * 100)}% of the ${fmt(goal)} goal`
          : forecast
            ? 'At your last 3 months’ pace'
            : undefined,
      tone: forecastShare !== null && forecastShare < 1 ? 'warn' : forecast ? 'good' : 'neutral',
    },
  ]

  return {
    months,
    lastYear: runningTotal(lastYear).map(({ month, value, total }) => ({ month, value, total })),
    forecast: forecast?.points ?? null,
    facts,
    existing: Object.fromEntries(thisYear.map((m) => [m.month, { value: m.value, note: m.note }])),
  }
}

/** Months the Log a value form offers, newest first: this year up to now, or all of a past year. */
export function logMonths(year: number, today: DateKey): MonthKey[] {
  const last = throughMonth(year, today)
  return Array.from({ length: last }, (_, i) => `${year}-${String(last - i).padStart(2, '0')}`)
}
