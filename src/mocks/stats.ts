import type { CompletionPoint } from '@/components/stats/CompletionLineChart'
import type { ConsistencyDay } from '@/components/stats/ConsistencyHeatmap'
import type { FunnelStep } from '@/components/stats/FunnelBars'
import type { Insight } from '@/components/stats/InsightsCard'
import type { KpiChange } from '@/components/stats/KpiCard'
import type { ReplyRateRow } from '@/components/stats/ReplyRateBars'
import type { RevenueByChannel, RevenueByTemplate } from '@/components/stats/RevenueCard'
import type { TagCount } from '@/components/stats/TagBars'
import type { TemplateStat } from '@/components/stats/TemplatesTable'
import { addDays, type DateKey } from '@/lib/dates'

/** Mock data from design/stats.png (top half). Today is Wednesday 28 Oct 2026; range = last 30 days. */

export const MOCK_STATS_TODAY: DateKey = '2026-10-28'

export const mockStatsSummary = 'Last 30 days · compared with the period before'

export const mockKpis: { label: string; value: string; change?: KpiChange; note?: string }[] = [
  { label: 'Task completion', value: '75%', change: { text: '+6 pts', direction: 'up' } },
  { label: 'Tasks completed', value: '142', change: { text: '+11 vs prior 30 days', direction: 'up' } },
  { label: 'Current streak', value: '12 days', note: 'Best 21 days' },
  { label: 'Outreach sent', value: '96', change: { text: '+14 vs prior 30 days', direction: 'up' } },
  { label: 'Reply rate', value: '18.8%', change: { text: '+3.1 pts', direction: 'up' } },
  { label: 'Meetings booked', value: '7', change: { text: '+2', direction: 'up' } },
]

/** Daily completion (%) for 29 Sep – 28 Oct, read off the design's light line. */
const DAILY = [62, 70, 55, 80, 77, 40, 68, 72, 85, 80, 66, 90, 50, 75, 82, 88, 70, 65, 79, 85, 91, 58, 76, 80, 83, 73, 92, 75, 86, 90]
/** The 7-day average the design shows over the same days (precomputed, like src/lib would). */
const AVERAGE = [67, 68, 66, 66, 67, 68, 63, 66, 68, 70, 72, 72, 73, 74, 74, 75, 74, 73, 72, 75, 76, 74, 75, 76, 76, 76, 79, 77, 79, 82]

export const mockCompletion: CompletionPoint[] = DAILY.map((daily, i) => ({
  date: addDays(MOCK_STATS_TODAY, i - (DAILY.length - 1)),
  daily: daily / 100,
  average: (AVERAGE[i] ?? daily) / 100,
}))

/** Same days with two days that had nothing planned, to show how the daily line breaks. */
export const mockCompletionWithGaps: CompletionPoint[] = mockCompletion.map((p, i) =>
  i === 5 || i === 6 ? { ...p, daily: null } : p,
)

/**
 * 12 weeks (Mon 10 Aug – Wed 28 Oct) of daily rates. Levels follow the design's
 * grid row by row (Mon…Sun), 0 = empty … 4 = darkest; turned back into rates.
 */
const HEAT_ROWS = [
  '211122333212', // Mon
  '444234434443', // Tue
  '324420102032', // Wed (last column = today)
  '20240304302-', // Thu
  '41123342230-', // Fri
  '31310101321-', // Sat
  '112311111010', // Sun
]
const LEVEL_RATE = [0, 0.4, 0.65, 0.85, 1] as const
const HEAT_START: DateKey = '2026-08-10'

export const mockConsistency: ConsistencyDay[] = HEAT_ROWS.flatMap((row, weekday) =>
  [...row].flatMap((ch, week) => {
    if (ch === '-') return []
    const level = Number(ch)
    // A few empty squares are days with nothing planned, the rest are days with nothing done.
    const rate = level === 0 && (week + weekday) % 3 === 0 ? null : LEVEL_RATE[level as 0 | 1 | 2 | 3 | 4]
    return [{ date: addDays(HEAT_START, week * 7 + weekday), rate }]
  }),
).filter((d) => d.date <= MOCK_STATS_TODAY)

export const mockConsistencyInsight = 'Tuesdays are your strongest day, and most tasks get done between 9 and 11 am.'

export const mockFunnel: FunnelStep[] = [
  { label: 'Contacted', count: 96, ofPrevious: null },
  { label: 'Replied', count: 18, ofPrevious: 0.19 },
  { label: 'Meeting', count: 7, ofPrevious: 0.39 },
  { label: 'Proposal', count: 4, ofPrevious: 0.57 },
  { label: 'Won', count: 2, ofPrevious: 0.5 },
]

export const mockReplyRates: ReplyRateRow[] = [
  { label: 'Phone', sent: 5, rate: 0.4 },
  { label: 'LinkedIn', sent: 29, rate: 0.241 },
  { label: 'Instagram', sent: 14, rate: 0.214 },
  { label: 'Email', sent: 48, rate: 0.125 },
]

// ---------------------------------------------------------------------------
// Overview, bottom half
// ---------------------------------------------------------------------------

export const mockInsights: Insight[] = [
  {
    id: 'wake-up',
    kind: 'routine',
    title: 'On days you wake up at 06:00 you finish 31% more tasks.',
    detail: '84% completion vs 64% on late days · based on 213 days',
  },
  {
    id: 'reply-day',
    kind: 'outreach',
    title: 'Messages sent on Tuesday get the most replies (27%).',
    detail: 'Mondays are lowest at 11% · consider batching outreach on Tuesdays',
  },
  {
    id: 'timed',
    kind: 'timing',
    title: 'Tasks with a set time get done 1.6× more often.',
    detail: '91% vs 57% for “anytime” tasks',
  },
  {
    id: 'energy',
    kind: 'energy',
    title: 'Low-energy days cut your outreach in half.',
    detail: '6 messages on energy 1–2 days vs 12 on average',
  },
]

export const mockRevenue: {
  total: number
  deals: number
  perMessage: number
  byChannel: RevenueByChannel[]
  byTemplate: RevenueByTemplate[]
} = {
  total: 6300,
  deals: 3,
  perMessage: 8.5,
  byChannel: [
    { label: 'Phone', amount: 3000 },
    { label: 'LinkedIn', amount: 1800 },
    { label: 'Email', amount: 1500 },
    { label: 'Instagram', amount: 0 },
  ],
  byTemplate: [
    { name: 'Opener A', amount: 3300, deals: 2 },
    { name: 'Phone script', amount: 3000, deals: 1 },
    { name: 'Opener B', amount: 0, deals: 0 },
  ],
}

export const mockTemplateStats: TemplateStat[] = [
  { id: 't-opener-b', name: 'Opener B', sent: 37, replies: 5, rate: 0.135 },
  { id: 't-phone', name: 'Phone script', sent: 5, replies: 2, rate: 0.4 },
  { id: 't-opener-a', name: 'Opener A', sent: 41, replies: 9, rate: 0.22 },
  { id: 't-follow-up', name: 'Follow-up #1', sent: 13, replies: 2, rate: 0.154 },
]

export const mockTagCounts: TagCount[] = [
  { label: 'Outreach', count: 46 },
  { label: 'Work', count: 41 },
  { label: 'Marketing', count: 22 },
  { label: 'Health', count: 19 },
  { label: 'Personal', count: 14 },
]
