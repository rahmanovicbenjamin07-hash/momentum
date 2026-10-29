/**
 * Stats → Overview: turns the SQL results into what the components show.
 * Pure functions (tested in statsOverview.test.ts); the maths itself lives in src/lib.
 */
import type { DailyCompletionRow, FunnelStepRow, ReplyRateRow, RevenueRow, TagCountRow } from '@/api/stats'
import type { CompletionPoint } from '@/components/stats/CompletionLineChart'
import type { ConsistencyDay } from '@/components/stats/ConsistencyHeatmap'
import type { FunnelStep } from '@/components/stats/FunnelBars'
import type { Insight as InsightCardData, InsightKind } from '@/components/stats/InsightsCard'
import type { KpiChange } from '@/components/stats/KpiCard'
import type { ReplyRateRow as ReplyBar } from '@/components/stats/ReplyRateBars'
import type { RevenueByChannel, RevenueByTemplate } from '@/components/stats/RevenueCard'
import type { TagCount } from '@/components/stats/TagBars'
import type { TemplateStat } from '@/components/stats/TemplatesTable'
import { addDays, dayIndex, daysBetween, type DateKey } from '@/lib/dates'
import { isScheduledOn } from '@/lib/todayList'
import { formatNumber1, movingAverage7, type Insight, type InsightDay, type InsightId } from '@/lib/stats'
import { CHANNEL_LABELS, STAGE_LABELS, type Channel, type Stage } from '@/schemas/outreach'
import type { RoutineItem } from '@/schemas/today'
import type { SentMessage } from './statsQueries'

// ---------------------------------------------------------------------------
// Ranges
// ---------------------------------------------------------------------------

/** Weeks in the Consistency heatmap. */
export const HEATMAP_WEEKS = 12
/** Days the Insights look back over (ending yesterday). */
export const INSIGHT_DAYS = 90

/**
 * The one daily-completion range that covers everything the Overview shows:
 * the previous period (for KPI changes), 6 extra days for the first 7-day
 * averages, the 12-week heatmap and the insights window.
 */
export function completionFetchRange(today: DateKey, previousFrom: DateKey, currentFrom: DateKey): { from: DateKey; to: DateKey } {
  const heatStart = addDays(addDays(today, -dayIndex(today)), -(HEATMAP_WEEKS - 1) * 7)
  const from = [previousFrom, addDays(currentFrom, -6), heatStart, insightWindow(today).from].sort()[0] ?? previousFrom
  return { from, to: today }
}

/** The last INSIGHT_DAYS days, ending yesterday (today isn't over yet). */
export function insightWindow(today: DateKey): { from: DateKey; to: DateKey } {
  return { from: addDays(today, -INSIGHT_DAYS), to: addDays(today, -1) }
}

export function inRange<T extends { day: string }>(rows: readonly T[], from: DateKey, to: DateKey): T[] {
  return rows.filter((r) => r.day >= from && r.day <= to)
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

export type PeriodTotals = {
  /** Tasks + routine done / planned (daily completion). */
  done: number
  total: number
  tasksCompleted: number
  sent: number
  replies: number
  meetings: number
}

const sum = <T>(rows: readonly T[], f: (row: T) => number) => rows.reduce((n, r) => n + f(r), 0)

export function periodTotals(input: {
  completion: readonly DailyCompletionRow[]
  tags: readonly TagCountRow[]
  replies: readonly ReplyRateRow[]
  funnel: readonly FunnelStepRow[]
}): PeriodTotals {
  const channels = input.replies.filter((r) => r.dimension === 'channel')
  return {
    done: sum(input.completion, (r) => r.done),
    total: sum(input.completion, (r) => r.total),
    tasksCompleted: sum(input.tags, (r) => r.done),
    sent: sum(channels, (r) => r.sent),
    replies: sum(channels, (r) => r.replies),
    meetings: input.funnel.find((r) => r.stage === 'meeting')?.contacts ?? 0,
  }
}

export type KpiData = { label: string; value: string; change?: KpiChange; note?: string }

const MINUS = '−'

function signed(n: number, text: string): string {
  if (n > 0) return `+${text}`
  if (n < 0) return `${MINUS}${text}`
  return text
}

function direction(n: number): KpiChange['direction'] {
  return n > 0 ? 'up' : n < 0 ? 'down' : 'flat'
}

/** "+11 vs prior 30 days", "Same as prior 30 days". */
function countChange(now: number, before: number, days: number): KpiChange {
  const d = now - before
  return { text: d === 0 ? `Same as prior ${days} days` : `${signed(d, String(Math.abs(d)))} vs prior ${days} days`, direction: direction(d) }
}

/** "+6 pts" from two fractions (rounded to whole points, or 1 decimal with `decimals`). */
function pointsChange(now: number | null, before: number | null, decimals = 0): KpiChange | undefined {
  if (now === null || before === null) return undefined
  const pts = Number(((now - before) * 100).toFixed(decimals))
  const text = `${signed(pts, decimals ? formatNumber1(Math.abs(pts)) : String(Math.abs(pts)))} pts`
  return { text, direction: direction(pts) }
}

const rate = (a: number, b: number) => (b > 0 ? a / b : null)
const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`

/** The six KPI cards, each compared with the period before. */
export function buildKpis(
  current: PeriodTotals,
  previous: PeriodTotals,
  rangeDays: number,
  streak: { current: number; best: number },
): KpiData[] {
  const completion = rate(current.done, current.total)
  const completionBefore = rate(previous.done, previous.total)
  const reply = rate(current.replies, current.sent)
  const replyBefore = rate(previous.replies, previous.sent)
  const meetingDelta = current.meetings - previous.meetings
  return [
    {
      label: 'Task completion',
      value: completion === null ? '—' : `${Math.round(completion * 100)}%`,
      change: pointsChange(completion, completionBefore),
    },
    { label: 'Tasks completed', value: String(current.tasksCompleted), change: countChange(current.tasksCompleted, previous.tasksCompleted, rangeDays) },
    { label: 'Current streak', value: days(streak.current), note: `Best ${days(streak.best)}` },
    { label: 'Outreach sent', value: String(current.sent), change: countChange(current.sent, previous.sent, rangeDays) },
    {
      label: 'Reply rate',
      value: reply === null ? '—' : `${formatNumber1(reply * 100)}%`,
      change: pointsChange(reply, replyBefore, 1),
    },
    {
      label: 'Meetings booked',
      value: String(current.meetings),
      change: { text: meetingDelta === 0 ? 'Same' : signed(meetingDelta, String(Math.abs(meetingDelta))), direction: direction(meetingDelta) },
    },
  ]
}

// ---------------------------------------------------------------------------
// Charts and lists
// ---------------------------------------------------------------------------

/**
 * Daily completion line from `from`. Pass rows that start 6 days earlier so the
 * first 7-day averages are complete.
 */
export function completionPoints(rows: readonly DailyCompletionRow[], from: DateKey): CompletionPoint[] {
  const sorted = [...rows].sort((a, b) => a.day.localeCompare(b.day))
  const daily = sorted.map((r) => (r.percent === null ? null : r.percent / 100))
  const average = movingAverage7(daily)
  return sorted
    .map((r, i) => ({ date: r.day, daily: daily[i] ?? null, average: average[i] ?? null }))
    .filter((p) => p.date >= from)
}

export function consistencyDays(rows: readonly DailyCompletionRow[]): ConsistencyDay[] {
  return rows.map((r) => ({ date: r.day, rate: r.percent === null ? null : r.percent / 100 }))
}

export function funnelSteps(rows: readonly FunnelStepRow[]): FunnelStep[] {
  return [...rows]
    .sort((a, b) => a.step - b.step)
    .map((r) => ({
      label: STAGE_LABELS[r.stage as Stage] ?? r.stage,
      count: r.contacts,
      ofPrevious: r.pct_of_previous === null ? null : r.pct_of_previous / 100,
    }))
}

function channelLabel(key: string | null): string {
  if (!key) return 'Other'
  return CHANNEL_LABELS[key as Channel] ?? key
}

export function channelReplyBars(rows: readonly ReplyRateRow[]): ReplyBar[] {
  return rows
    .filter((r) => r.dimension === 'channel')
    .map((r) => ({ label: channelLabel(r.key), sent: r.sent, rate: r.rate / 100 }))
}

/** Templates that were used (messages without a template are left out). */
export function templateStats(rows: readonly ReplyRateRow[]): TemplateStat[] {
  return rows
    .filter((r) => r.dimension === 'template' && r.key !== null)
    .map((r) => ({ id: r.key ?? '', name: r.label ?? 'Template', sent: r.sent, replies: r.replies, rate: r.rate / 100 }))
}

export function tagCounts(rows: readonly TagCountRow[]): TagCount[] {
  return rows.map((r) => ({ label: r.tag ? r.tag.charAt(0).toUpperCase() + r.tag.slice(1) : 'Untagged', count: r.done }))
}

export type RevenueData = {
  total: number
  deals: number
  perMessage: number | null
  byChannel: RevenueByChannel[]
  byTemplate: RevenueByTemplate[]
}

/**
 * "Revenue from outreach" for the year. Channels and templates that were used
 * but won nothing show with €0, like in the design.
 */
export function revenueCard(revenue: readonly RevenueRow[], replies: readonly ReplyRateRow[]): RevenueData {
  const wonChannels = revenue.filter((r) => r.dimension === 'channel')
  const total = sum(wonChannels, (r) => r.amount)
  const deals = sum(wonChannels, (r) => r.deals)
  const sent = sum(replies.filter((r) => r.dimension === 'channel'), (r) => r.sent)

  const channelAmounts = new Map<string, number>()
  for (const r of replies.filter((x) => x.dimension === 'channel')) channelAmounts.set(channelLabel(r.key), 0)
  for (const r of wonChannels) channelAmounts.set(channelLabel(r.key), (channelAmounts.get(channelLabel(r.key)) ?? 0) + r.amount)

  const templates = new Map<string, RevenueByTemplate>()
  for (const r of replies) {
    if (r.dimension === 'template' && r.key) templates.set(r.key, { name: r.label ?? 'Template', amount: 0, deals: 0 })
  }
  for (const r of revenue) {
    if (r.dimension === 'template' && r.key) templates.set(r.key, { name: r.label ?? 'Template', amount: r.amount, deals: r.deals })
  }

  return {
    total,
    deals,
    perMessage: sent > 0 && total > 0 ? total / sent : null,
    byChannel: [...channelAmounts.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount),
    byTemplate: [...templates.values()].sort((a, b) => b.amount - a.amount),
  }
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

/**
 * One InsightDay per day from…to: tasks from daily completion, whether the
 * wake-up item was done (null when not scheduled), energy and messages sent.
 */
export function insightDays(input: {
  from: DateKey
  to: DateKey
  completion: readonly DailyCompletionRow[]
  wakeItem: Pick<RoutineItem, 'days' | 'active' | 'created_at'> | null
  wakeChecks: readonly { date: DateKey; done: boolean }[]
  energy: readonly { date: DateKey; energy: number | null }[]
  sentByDay: ReadonlyMap<DateKey, number>
  timeZone: string
}): InsightDay[] {
  const completion = new Map(input.completion.map((r) => [r.day, r]))
  const woke = new Map(input.wakeChecks.map((c) => [c.date, c.done]))
  const energy = new Map(input.energy.map((e) => [e.date, e.energy]))
  const out: InsightDay[] = []
  for (let i = 0; i <= daysBetween(input.from, input.to); i += 1) {
    const date = addDays(input.from, i)
    const row = completion.get(date)
    const scheduled = input.wakeItem ? isScheduledOn(input.wakeItem, date, input.timeZone) : false
    out.push({
      date,
      wakeDone: scheduled ? (woke.get(date) ?? false) : null,
      tasksDone: row?.tasks_done ?? 0,
      tasksTotal: row?.tasks_total ?? 0,
      energy: energy.get(date) ?? null,
      outreachSent: input.sentByDay.get(date) ?? 0,
    })
  }
  return out
}

/** Messages sent per local day. */
export function sentPerDay(messages: readonly SentMessage[], toDay: (iso: string) => DateKey): Map<DateKey, number> {
  const counts = new Map<DateKey, number>()
  for (const m of messages) {
    const day = toDay(m.occurred_at)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  return counts
}

const INSIGHT_KIND: Record<InsightId, InsightKind> = {
  wake: 'routine',
  replyWeekday: 'outreach',
  timedTasks: 'timing',
  lowEnergy: 'energy',
}

export function insightCards(insights: readonly Insight[]): InsightCardData[] {
  return insights.map((i) => ({ id: i.id, kind: INSIGHT_KIND[i.id], title: i.title, detail: i.detail }))
}
