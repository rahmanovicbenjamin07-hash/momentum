import { describe, expect, it } from 'vitest'
import type { MetricRow } from '@/api/metrics'
import type { DailyCompletionRow, FunnelStepRow, ReplyRateRow, RevenueRow, RoutineDayRow } from '@/api/stats'
import type { ShareCard } from '@/lib/reports'
import type { Contact } from '@/schemas/outreach'
import type { MetricEntry } from '@/schemas/stats'
import type { RoutineItem } from '@/schemas/today'
import { shareCardLayout, shareFileName, type TextOp } from './shareImage'
import { logMonths, metricCard, metricView, throughMonth } from './statsMetrics'
import {
  buildKpis,
  channelReplyBars,
  completionFetchRange,
  completionPoints,
  funnelSteps,
  insightDays,
  revenueCard,
  sentPerDay,
  tagCounts,
  templateStats,
  type PeriodTotals,
} from './statsOverview'
import { buildReportInput, reportMetrics, reportRanges } from './statsReports'
import { checksFromRows, streakDaysFromRows, statsYears, yearSpan } from './statsRoutine'

const TODAY = '2026-10-28' // Wednesday

// ===========================================================================
// Overview
// ===========================================================================

describe('completionFetchRange', () => {
  it('covers the previous period, heatmap and 90-day insights in one call', () => {
    // previous 30 days start 30 Aug; heatmap starts Mon 10 Aug; insights start 30 Jul.
    expect(completionFetchRange(TODAY, '2026-08-30', '2026-09-29')).toEqual({ from: '2026-07-30', to: TODAY })
  })
})

describe('buildKpis', () => {
  const current: PeriodTotals = { done: 75, total: 100, tasksCompleted: 142, sent: 96, replies: 18, meetings: 7 }
  const previous: PeriodTotals = { done: 69, total: 100, tasksCompleted: 131, sent: 82, replies: 13, meetings: 5 }

  it('formats the six cards like the design', () => {
    const kpis = buildKpis(current, previous, 30, { current: 12, best: 21 })
    expect(kpis.map((k) => [k.label, k.value, k.change?.text ?? k.note])).toEqual([
      ['Task completion', '75%', '+6 pts'],
      ['Tasks completed', '142', '+11 vs prior 30 days'],
      ['Current streak', '12 days', 'Best 21 days'],
      ['Outreach sent', '96', '+14 vs prior 30 days'],
      ['Reply rate', '18.8%', '+2.9 pts'],
      ['Meetings booked', '7', '+2'],
    ])
    expect(kpis[0]?.change?.direction).toBe('up')
  })

  it('handles drops and empty periods', () => {
    const empty: PeriodTotals = { done: 0, total: 0, tasksCompleted: 0, sent: 0, replies: 0, meetings: 0 }
    const kpis = buildKpis(empty, current, 7, { current: 1, best: 1 })
    expect(kpis[0]).toMatchObject({ value: '—', change: undefined })
    expect(kpis[1]?.change).toEqual({ text: '−142 vs prior 7 days', direction: 'down' })
    expect(kpis[2]).toMatchObject({ value: '1 day', note: 'Best 1 day' })
    expect(kpis[4]).toMatchObject({ value: '—', change: undefined })
  })
})

function completionRow(day: string, percent: number | null): DailyCompletionRow {
  return { day, percent, done: 0, total: 0, tasks_done: 0, tasks_total: 0, routine_done: 0, routine_total: 0 }
}

describe('charts and lists', () => {
  it('completionPoints averages over the 6 earlier days, then shows the range only', () => {
    const rows = ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'].map(
      (day, i) => completionRow(day, i === 3 ? null : 70 + i * 2),
    )
    const points = completionPoints(rows, '2026-10-26')
    expect(points.map((p) => p.date)).toEqual(['2026-10-26', '2026-10-27'])
    // 26 Oct: average of 20–26 Oct without the empty 23 Oct = (70+72+74+78+80+82)/6
    expect(points[0]?.average).toBeCloseTo((70 + 72 + 74 + 78 + 80 + 82) / 600)
    expect(points[0]?.daily).toBe(0.82)
  })

  it('funnel in order with % of previous as a fraction', () => {
    const rows: FunnelStepRow[] = [
      { stage: 'replied', step: 2, contacts: 18, pct_of_previous: 18.8 },
      { stage: 'contacted', step: 1, contacts: 96, pct_of_previous: null },
    ]
    expect(funnelSteps(rows)).toEqual([
      { label: 'Contacted', count: 96, ofPrevious: null },
      { label: 'Replied', count: 18, ofPrevious: 0.188 },
    ])
  })

  const replies: ReplyRateRow[] = [
    { dimension: 'channel', key: 'email', label: null, sent: 48, replies: 6, rate: 12.5 },
    { dimension: 'channel', key: 'linkedin', label: null, sent: 29, replies: 7, rate: 24.1 },
    { dimension: 'channel', key: 'phone', label: null, sent: 5, replies: 2, rate: 40 },
    { dimension: 'source', key: 'maps', label: null, sent: 82, replies: 15, rate: 18.3 },
    { dimension: 'template', key: 't-a', label: 'Opener A', sent: 41, replies: 9, rate: 22 },
    { dimension: 'template', key: 't-b', label: 'Opener B', sent: 37, replies: 5, rate: 13.5 },
    { dimension: 'template', key: null, label: null, sent: 4, replies: 1, rate: 25 },
  ]

  it('reply bars by channel and the templates table', () => {
    const bars = channelReplyBars(replies)
    expect(bars.map((b) => [b.label, b.sent])).toEqual([
      ['Email', 48],
      ['LinkedIn', 29],
      ['Phone', 5],
    ])
    expect(bars[1]?.rate).toBeCloseTo(0.241)
    expect(templateStats(replies).map((t) => t.name)).toEqual(['Opener A', 'Opener B'])
  })

  it('tags get capitals, no tag is "Untagged"', () => {
    expect(tagCounts([{ tag: 'outreach', done: 46 }, { tag: null, done: 3 }])).toEqual([
      { label: 'Outreach', count: 46 },
      { label: 'Untagged', count: 3 },
    ])
  })

  it('revenue: totals, € per message, and €0 rows for used channels and templates', () => {
    const revenue: RevenueRow[] = [
      { dimension: 'channel', key: 'phone', label: null, deals: 1, amount: 3000 },
      { dimension: 'channel', key: 'linkedin', label: null, deals: 1, amount: 1800 },
      { dimension: 'channel', key: 'email', label: null, deals: 1, amount: 1500 },
      { dimension: 'template', key: 't-a', label: 'Opener A', deals: 2, amount: 3300 },
    ]
    const card = revenueCard(revenue, replies)
    expect(card).toMatchObject({ total: 6300, deals: 3 })
    expect(card.perMessage).toBeCloseTo(6300 / 82)
    expect(card.byChannel.map((c) => [c.label, c.amount])).toEqual([
      ['Phone', 3000],
      ['LinkedIn', 1800],
      ['Email', 1500],
    ])
    expect(card.byTemplate).toEqual([
      { name: 'Opener A', amount: 3300, deals: 2 },
      { name: 'Opener B', amount: 0, deals: 0 },
    ])
  })
})

describe('insight inputs', () => {
  it('builds one day per date with wake-up, tasks, energy and messages', () => {
    const wake = { days: [true, true, true, true, true, false, false], active: true, created_at: '2026-01-01T06:00:00Z' }
    const days = insightDays({
      from: '2026-10-23', // Friday
      to: '2026-10-26', // Monday
      completion: [{ ...completionRow('2026-10-23', 50), tasks_done: 2, tasks_total: 4 }],
      wakeItem: wake,
      wakeChecks: [{ date: '2026-10-23', done: true }],
      energy: [{ date: '2026-10-24', energy: 2 }],
      sentByDay: new Map([['2026-10-26', 5]]),
      timeZone: 'Europe/Sarajevo',
    })
    expect(days.map((d) => [d.date, d.wakeDone, d.tasksDone, d.tasksTotal, d.energy, d.outreachSent])).toEqual([
      ['2026-10-23', true, 2, 4, null, 0],
      ['2026-10-24', null, 0, 0, 2, 0],
      ['2026-10-25', null, 0, 0, null, 0],
      ['2026-10-26', false, 0, 0, null, 5],
    ])
  })

  it('counts messages per local day', () => {
    const counts = sentPerDay(
      [
        { occurred_at: '2026-10-26T22:30:00Z', got_reply: false },
        { occurred_at: '2026-10-27T09:00:00Z', got_reply: true },
      ],
      (iso) => (iso < '2026-10-26T23:00:00Z' ? '2026-10-26' : '2026-10-27'),
    )
    expect([...counts]).toEqual([
      ['2026-10-26', 1],
      ['2026-10-27', 1],
    ])
  })
})

// ===========================================================================
// My metrics
// ===========================================================================

const USER = '0b7e8c1d-2f3a-4b5c-9d6e-7f8091a2b3c4'
const money: MetricRow = {
  id: 'm-money',
  user_id: USER,
  created_at: '2026-01-01T00:00:00Z',
  name: 'Money earned',
  unit: 'eur',
  log_every: 'monthly',
  yearly_goal: 18000,
  builtin: 'money_earned',
  position: 0,
}

function entry(month: string, value: number, note: string | null = null): MetricEntry {
  return {
    id: `e-${month}`,
    user_id: USER,
    created_at: '2026-01-01T00:00:00Z',
    metric_id: money.id,
    entry_date: `${month}-01`,
    value,
    note,
    contact_id: null,
  }
}

// design/progress.png: 2026 Jan–Oct, 2025 had €8,150 by October.
const moneyEntries: MetricEntry[] = [
  ...[850, 920, 1100, 980, 1350, 1500, 1420, 1680, 1950, 2200].map((v, i) =>
    entry(`2026-${String(i + 1).padStart(2, '0')}`, v, i === 9 ? '2 new clients' : null),
  ),
  ...[500, 550, 600, 650, 750, 800, 950, 1100, 1200, 1050, 1300, 1400].map((v, i) =>
    entry(`2025-${String(i + 1).padStart(2, '0')}`, v),
  ),
]

describe('metrics', () => {
  it('card: total so far, +71% vs same time last year, 78% of goal', () => {
    const card = metricCard(money, moneyEntries, 2026, TODAY)
    expect(card).toMatchObject({ total: 13950, lastYear: 2025, goal: 18000 })
    expect(card.change).toBeCloseTo(0.7117, 4)
    expect(card.goalShare).toBeCloseTo(0.775, 3)
  })

  it('view: facts like the design, forecast to December, logged values for the form', () => {
    const view = metricView(money, moneyEntries, 2026, TODAY)
    expect(view.facts.map((f) => f.value)).toEqual(['€13,950', '+71%', '+11%', 'Accelerating', 'Oct · €2,200', '≈ €17,837'])
    expect(view.facts[5]?.detail).toBe('99% of the €18,000 goal')
    expect(view.months).toHaveLength(10)
    expect(view.months.at(-1)).toMatchObject({ month: '2026-10', total: 13950, note: '2 new clients' })
    expect(view.lastYear).toHaveLength(12)
    expect(view.forecast?.map((p) => p.month)).toEqual(['2026-10', '2026-11', '2026-12'])
    expect(view.existing['2026-10']).toEqual({ value: 2200, note: '2 new clients' })
  })

  it('a past year has no forecast and compares the whole year', () => {
    const view = metricView(money, moneyEntries, 2025, TODAY)
    expect(view.forecast).toBeNull()
    expect(view.facts[0]).toMatchObject({ label: '2025', value: '€10,850' })
    expect(throughMonth(2025, TODAY)).toBe(12)
  })

  it('a new metric with nothing logged shows dashes', () => {
    const view = metricView({ ...money, yearly_goal: null }, [], 2026, TODAY)
    expect(view.facts.map((f) => f.value)).toEqual(['€0', '—', '—', '—', '—', '—'])
    expect(view.months).toEqual([])
  })

  it('log months: this year up to now, newest first', () => {
    expect(logMonths(2026, TODAY)).toEqual(['2026-10', '2026-09', '2026-08', '2026-07', '2026-06', '2026-05', '2026-04', '2026-03', '2026-02', '2026-01'])
    expect(logMonths(2025, TODAY)).toHaveLength(12)
  })
})

// ===========================================================================
// Routine
// ===========================================================================

function dayRow(day: string, done: boolean, miss_reason: string | null = null, scheduled = true, itemId = 'r-wake'): RoutineDayRow {
  return { routine_item_id: itemId, title: 'Wake up at 06:00', day, scheduled, done, miss_reason }
}

describe('routine rows', () => {
  it('leaves out an unanswered today, keeps answered days', () => {
    const rows = [dayRow('2026-10-27', false, 'Tired'), dayRow(TODAY, false), dayRow('2026-10-26', true), dayRow('2026-10-26', true, null, true, 'other')]
    expect(checksFromRows(rows, 'r-wake', TODAY)).toEqual([
      { date: '2026-10-27', done: false, miss_reason: 'Tired' },
      { date: '2026-10-26', done: true, miss_reason: null },
    ])
    expect(checksFromRows([dayRow(TODAY, true)], 'r-wake', TODAY)).toHaveLength(1)
  })

  it('streak days cover every date, counting scheduled rows only', () => {
    const rows = [dayRow('2026-10-26', true), dayRow('2026-10-26', false, null, true, 'b'), dayRow('2026-10-27', true, null, false)]
    expect(streakDaysFromRows(rows, '2026-10-26', '2026-10-28')).toEqual([
      { date: '2026-10-26', scheduled: 2, done: 1 },
      { date: '2026-10-27', scheduled: 0, done: 0 },
      { date: '2026-10-28', scheduled: 0, done: 0 },
    ])
  })

  it('years and spans', () => {
    expect(statsYears(TODAY)).toEqual([2026, 2025])
    expect(yearSpan(2026, TODAY)).toEqual({ from: '2026-01-01', to: TODAY })
    expect(yearSpan(2025, TODAY)).toEqual({ from: '2025-01-01', to: '2025-12-31' })
  })
})

// ===========================================================================
// Reports
// ===========================================================================

describe('reportRanges', () => {
  it('month so far vs the same days of last month', () => {
    expect(reportRanges('month', TODAY)).toMatchObject({
      month: '2026-10',
      current: { from: '2026-10-01', to: TODAY },
      previous: { from: '2026-09-01', to: '2026-09-28' },
      monthLabel: 'October 2026',
      yearLabel: '2026 so far',
    })
    // 31 March vs February: stops at the end of February.
    expect(reportRanges('month', '2026-03-31').previous).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    // January compares with December of the year before.
    expect(reportRanges('month', '2026-01-15').previous).toEqual({ from: '2025-12-01', to: '2025-12-15' })
  })

  it('year so far vs last year up to the same date', () => {
    expect(reportRanges('year', TODAY)).toMatchObject({
      current: { from: '2026-01-01', to: TODAY },
      previous: { from: '2025-01-01', to: '2025-10-28' },
    })
    expect(reportRanges('year', '2028-02-29').previous).toEqual({ from: '2027-01-01', to: '2027-02-28' })
  })
})

describe('reportMetrics', () => {
  it('month: this month, last month and the best earlier month', () => {
    expect(reportMetrics([money], moneyEntries, reportRanges('month', TODAY))).toEqual([
      { name: 'Money earned', unit: 'eur', value: 2200, previous: 1950, bestBefore: 1950 },
    ])
  })

  it('year: Jan–Oct this year vs Jan–Oct last year', () => {
    expect(reportMetrics([money], moneyEntries, reportRanges('year', TODAY))).toEqual([
      { name: 'Money earned', unit: 'eur', value: 13950, previous: 8150 },
    ])
  })
})

describe('buildReportInput', () => {
  const wakeItem: RoutineItem = {
    id: 'r-wake',
    user_id: USER,
    created_at: '2026-01-01T06:00:00Z',
    title: 'Wake up at 06:00',
    days: [true, true, true, true, true, false, false],
    time: '06:00:00',
    position: 0,
    active: true,
  }
  const won = (name: string, month: string, amount: number) =>
    ({ name, stage: 'won', won_month: `${month}-01`, won_amount: amount }) as Contact

  it('adds up deals, streaks and routine for both periods', () => {
    const ranges = reportRanges('month', TODAY)
    // Every weekday 1 Sep – 28 Oct done, except Mon 14 Sep.
    const rows: RoutineDayRow[] = []
    for (let d = new Date('2026-09-01T00:00:00Z'); d <= new Date('2026-10-28T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
      const day = d.toISOString().slice(0, 10)
      if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue
      rows.push(dayRow(day, day !== '2026-09-14', day === '2026-09-14' ? 'Sick' : null))
    }
    const input = buildReportInput({
      ranges,
      today: TODAY,
      timeZone: 'Europe/Sarajevo',
      current: {
        tags: [{ tag: 'work', done: 100 }, { tag: null, done: 28 }],
        replies: [{ dimension: 'channel', key: 'email', label: null, sent: 96, replies: 18, rate: 18.8 }],
        funnel: [{ stage: 'meeting', step: 3, contacts: 7, pct_of_previous: 39 }],
      },
      previous: { tags: [{ tag: 'work', done: 119 }], replies: [], funnel: [] },
      contacts: [won('Café Rondo', '2026-10', 1500), won('Nova Dental', '2026-09', 900), { name: 'Open lead', stage: 'replied' } as Contact],
      routineItems: [wakeItem],
      routineDays: rows,
      metrics: [money],
      entries: moneyEntries,
    })

    expect(input.current).toEqual({
      tasksCompleted: 128,
      outreachSent: 96,
      replies: 18,
      meetings: 7,
      dealsWon: 1,
      dealsAmount: 1500,
      longestStreak: 28, // 1–28 Oct (weekends have nothing scheduled, so they count)
    })
    expect(input.previous).toMatchObject({ tasksCompleted: 119, dealsWon: 1, dealsAmount: 900 })
    expect(input.dealNames).toEqual(['Café Rondo'])
    // 1–28 Oct: 20 weekdays, all done (today included, it is ticked). 1–28 Sep: 20, one missed.
    expect(input.routine).toEqual([
      { title: 'Wake up at 06:00', done: 20, scheduled: 20, previousDone: 19, previousScheduled: 20 },
    ])
  })
})

// ===========================================================================
// Share image
// ===========================================================================

describe('share image', () => {
  const share: ShareCard = { heading: 'My October', routinePercent: 0.9386, tasksCompleted: 128, longestStreak: 12, earned: 2200, outreachSent: 96 }
  const texts = (s: ShareCard) => shareCardLayout(s).ops.filter((o): o is TextOp => o.kind === 'text').map((o) => o.text)

  it('draws the same numbers as the card, and nothing else', () => {
    expect(texts(share)).toEqual([
      'MY OCTOBER',
      'momentum',
      '94%',
      'of my daily routine done',
      '128',
      'tasks completed',
      '12 days',
      'longest streak',
      '€2,200',
      'earned',
      '96',
      'outreach messages',
    ])
  })

  it('leaves out "earned" without a money metric and keeps the card inside its height', () => {
    const layout = shareCardLayout({ ...share, earned: null, routinePercent: null })
    expect(texts({ ...share, earned: null })).not.toContain('earned')
    expect(layout.ops.every((o) => (o.kind === 'line' ? o.y : o.y) < layout.height)).toBe(true)
    expect(texts({ ...share, routinePercent: null })).toContain('—')
  })

  it('file name from the heading', () => {
    expect(shareFileName('My October')).toBe('momentum-my-october.png')
    expect(shareFileName('My 2026')).toBe('momentum-my-2026.png')
  })
})
