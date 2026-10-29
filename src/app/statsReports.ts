/**
 * Stats → Reports: the totals for one period and the one before, ready for
 * monthReport / yearReport in src/lib/reports. Pure (tested in statsReports.test.ts).
 */
import type { MetricRow } from '@/api/metrics'
import type { FunnelStepRow, ReplyRateRow, RoutineDayRow, TagCountRow } from '@/api/stats'
import type { ReportKind } from '@/components/reports/ReportPeriodToggle'
import { addDays, daysBetween, type DateKey } from '@/lib/dates'
import { groupByMonth, type MonthKey } from '@/lib/metrics'
import { monthName, previousMonth, reportRange, type ReportInput, type ReportMetric, type ReportNumbers } from '@/lib/reports'
import { routineTally } from '@/lib/routineStats'
import type { DateRange } from '@/lib/stats'
import { longestStreak } from '@/lib/streak'
import type { Contact } from '@/schemas/outreach'
import type { MetricEntry } from '@/schemas/stats'
import type { RoutineItem } from '@/schemas/today'
import { checksFromRows, streakDaysFromRows } from './statsRoutine'

export type ReportRanges = {
  kind: ReportKind
  /** The report's month ("2026-10") — the current month. */
  month: MonthKey
  year: number
  current: DateRange
  previous: DateRange
  /** "October 2026" / "2026 so far" for the toggle. */
  monthLabel: string
  yearLabel: string
}

/**
 * Current month (or year) so far, and the same stretch of the period before:
 * 1–28 Oct vs 1–28 Sep, or 1 Jan – 28 Oct 2026 vs 1 Jan – 28 Oct 2025.
 * A finished period compares with the whole period before.
 */
export function reportRanges(kind: ReportKind, today: DateKey): ReportRanges {
  const month = today.slice(0, 7)
  const year = Number(today.slice(0, 4))
  const labels = { monthLabel: `${monthName(month)} ${year}`, yearLabel: `${year} so far` }

  if (kind === 'year') {
    const monthDay = today.slice(5)
    const prevEnd = monthDay === '02-29' ? `${year - 1}-02-28` : `${year - 1}-${monthDay}`
    return { kind, month, year, current: { from: `${year}-01-01`, to: today }, previous: { from: `${year - 1}-01-01`, to: prevEnd }, ...labels }
  }

  const current = { from: `${month}-01`, to: today }
  const prev = reportRange({ kind: 'month', month: previousMonth(month) })
  const sameDay = addDays(prev.from, daysBetween(current.from, current.to))
  return { kind, month, year, current, previous: { from: prev.from, to: sameDay < prev.to ? sameDay : prev.to }, ...labels }
}

const sum = <T>(rows: readonly T[], f: (row: T) => number) => rows.reduce((n, r) => n + f(r), 0)

/** Won deals whose paid month falls in the period. */
function dealsIn(contacts: readonly Contact[], range: DateRange): Contact[] {
  const firstMonth = range.from.slice(0, 7)
  const lastMonth = range.to.slice(0, 7)
  return contacts.filter((c) => {
    if (c.stage !== 'won' || !c.won_month) return false
    const m = c.won_month.slice(0, 7)
    return m >= firstMonth && m <= lastMonth
  })
}

export type PeriodRows = {
  tags: readonly TagCountRow[]
  replies: readonly ReplyRateRow[]
  funnel: readonly FunnelStepRow[]
}

function numbers(rows: PeriodRows, deals: readonly Contact[], streak: number): ReportNumbers {
  const channels = rows.replies.filter((r) => r.dimension === 'channel')
  return {
    tasksCompleted: sum(rows.tags, (r) => r.done),
    outreachSent: sum(channels, (r) => r.sent),
    replies: sum(channels, (r) => r.replies),
    meetings: rows.funnel.find((r) => r.stage === 'meeting')?.contacts ?? 0,
    dealsWon: deals.length,
    dealsAmount: sum(deals, (c) => c.won_amount ?? 0),
    longestStreak: streak,
  }
}

/** Each metric's value for the period, the period before, and (for months) its best earlier month. */
export function reportMetrics(
  metrics: readonly MetricRow[],
  entries: readonly MetricEntry[],
  ranges: ReportRanges,
): ReportMetric[] {
  return metrics.map((metric) => {
    const months = groupByMonth(entries.filter((e) => e.metric_id === metric.id))
    const valueOf = (m: MonthKey) => months.find((x) => x.month === m)?.value
    if (ranges.kind === 'month') {
      const earlier = months.filter((m) => m.month < ranges.month).map((m) => m.value)
      return {
        name: metric.name,
        unit: metric.unit,
        value: valueOf(ranges.month) ?? 0,
        previous: valueOf(previousMonth(ranges.month)) ?? null,
        bestBefore: earlier.length ? Math.max(...earlier) : null,
      }
    }
    const through = ranges.month.slice(5)
    const total = (year: number) =>
      sum(months.filter((m) => m.month.startsWith(`${year}-`) && m.month.slice(5) <= through), (m) => m.value)
    const previous = total(ranges.year - 1)
    return { name: metric.name, unit: metric.unit, value: total(ranges.year), previous: previous > 0 ? previous : null }
  })
}

/** Everything monthReport / yearReport need, from the loaded rows. */
export function buildReportInput(input: {
  ranges: ReportRanges
  today: DateKey
  timeZone: string
  current: PeriodRows
  previous: PeriodRows
  contacts: readonly Contact[]
  routineItems: readonly RoutineItem[]
  /** Routine-day rows covering previous.from … today. */
  routineDays: readonly RoutineDayRow[]
  metrics: readonly MetricRow[]
  entries: readonly MetricEntry[]
}): ReportInput {
  const { ranges, today } = input
  const streakIn = (r: DateRange) => longestStreak(streakDaysFromRows(input.routineDays, r.from, r.to))
  const currentDeals = dealsIn(input.contacts, ranges.current)

  return {
    current: numbers(input.current, currentDeals, streakIn(ranges.current)),
    previous: numbers(input.previous, dealsIn(input.contacts, ranges.previous), streakIn(ranges.previous)),
    metrics: reportMetrics(input.metrics, input.entries, ranges),
    routine: input.routineItems.map((item) => {
      const checks = checksFromRows(input.routineDays, item.id, today)
      const now = routineTally(item, checks, ranges.current, today, input.timeZone)
      const before = routineTally(item, checks, ranges.previous, today, input.timeZone)
      return {
        title: item.title,
        done: now.done,
        scheduled: now.scheduled,
        ...(before.scheduled > 0 ? { previousDone: before.done, previousScheduled: before.scheduled } : {}),
      }
    }),
    dealNames: currentDeals.map((c) => c.name),
  }
}
