import { MetricFacts, type MetricFact } from '@/components/metrics/MetricFacts'
import { monthName, monthShort } from '@/components/metrics/format'
import { ROUTINE_TREND_LABELS, type RoutineItemStats } from '@/lib/routineStats'
import { daysText, rateText } from './format'

export type RoutineFactsData = Pick<
  RoutineItemStats,
  'done' | 'scheduled' | 'missed' | 'rate' | 'trend' | 'bestMonth' | 'forecast' | 'perfectYear' | 'thisMonth'
>

type RoutineFactsProps = {
  stats: RoutineFactsData
  /** Month that contains today, e.g. "2026-10", for "October so far". */
  currentMonth: string
}

/** The six facts: done this year · completion rate · trend · best month · year-end forecast · this month. */
export function RoutineFacts({ stats, currentMonth }: RoutineFactsProps) {
  const { done, scheduled, missed, rate, trend, bestMonth, forecast, perfectYear, thisMonth } = stats
  const facts: MetricFact[] = [
    { label: 'Done this year', value: daysText(done), detail: `Out of ${scheduled} scheduled` },
    {
      label: 'Completion rate',
      value: rateText(rate),
      detail: `${daysText(missed)} missed`,
      tone: rate === null ? 'neutral' : rate >= 0.8 ? 'good' : rate >= 0.5 ? 'warn' : 'bad',
    },
    {
      label: 'Trend',
      value: trend ? ROUTINE_TREND_LABELS[trend] : '—',
      detail: trend ? 'Based on monthly completion rate' : 'Needs a few months of data',
      tone: trend === 'improving' ? 'good' : trend === 'slipping' ? 'bad' : 'neutral',
    },
    {
      label: 'Best month',
      value: bestMonth ? `${monthShort(bestMonth.month)} · ${rateText(bestMonth.rate)}` : '—',
      detail: bestMonth ? `${bestMonth.done} of ${daysText(bestMonth.scheduled)}` : undefined,
    },
    {
      label: 'Year-end forecast',
      value: forecast ? `≈ ${daysText(forecast.total)}` : '—',
      detail: `Perfect year would be ${perfectYear}`,
    },
    {
      label: 'This month',
      value: thisMonth ? `${thisMonth.done} / ${thisMonth.scheduled}` : '—',
      detail: thisMonth ? `${monthName(currentMonth)} so far` : 'Not this year',
    },
  ]
  return <MetricFacts facts={facts} />
}
