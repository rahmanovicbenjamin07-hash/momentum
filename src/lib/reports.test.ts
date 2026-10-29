import { describe, expect, it } from 'vitest'
import {
  highlights,
  keyNumbers,
  monthReport,
  previousMonth,
  reportRange,
  yearReport,
  type ReportInput,
} from './reports'

/** October 2026 from design/reports.png, with September as the previous month. */
function october(): ReportInput {
  return {
    current: {
      tasksCompleted: 128,
      outreachSent: 96,
      replies: 18,
      meetings: 7,
      dealsWon: 1,
      dealsAmount: 1500,
      longestStreak: 12,
    },
    previous: {
      tasksCompleted: 119,
      outreachSent: 82,
      replies: 13,
      meetings: 5,
      dealsWon: 0,
      dealsAmount: 0,
      longestStreak: 9,
    },
    metrics: [
      { name: 'Money earned', unit: 'eur', value: 2200, previous: 1950, bestBefore: 1950 },
      { name: 'Trainings', unit: 'count', value: 13, previous: 15 },
      { name: 'Hours worked', unit: 'hours', value: 148, previous: 160 },
    ],
    routine: [
      { title: 'Read 20 pages', done: 27, scheduled: 31, previousDone: 26, previousScheduled: 30 },
      { title: 'Wake up at 06:00', done: 20, scheduled: 20, previousDone: 21, previousScheduled: 22 },
      { title: 'Morning workout', done: 13, scheduled: 13, previousDone: 13, previousScheduled: 13 },
      { title: 'Send 10 outreach messages', done: 19, scheduled: 20, previousDone: 20, previousScheduled: 22 },
      { title: 'Plan today’s top 3', done: 28, scheduled: 30, previousDone: 27, previousScheduled: 30 },
    ],
    bestReplyRateBefore: 0.16,
    dealNames: ['Café Rondo'],
  }
}

describe('monthReport', () => {
  const report = monthReport('2026-10', october())

  it('has titles and the previous period label', () => {
    expect(report.title).toBe('October 2026')
    expect(report.previousLabel).toBe('September')
  })

  it('share card: 94% routine, 128 tasks, 12 days, €2,200, 96 messages', () => {
    expect(report.share).toEqual({
      heading: 'My October',
      routinePercent: 107 / 114,
      tasksCompleted: 128,
      longestStreak: 12,
      earned: 2200,
      outreachSent: 96,
    })
    expect(Math.round((report.share.routinePercent ?? 0) * 100)).toBe(94)
  })

  it('the share card has no names, contacts or routine titles', () => {
    const text = JSON.stringify(report.share)
    expect(text).not.toContain('Café Rondo')
    expect(text).not.toContain('Wake up')
    expect(text).not.toContain('Money earned')
  })

  it('picks the 3 highlights: records and perfect months first', () => {
    expect(report.highlights).toEqual([
      'Reply rate climbed to 18.8%, your best since you started tracking.',
      'Best month yet for money earned: €2,200, up 13% on September.',
      'A perfect month for wake up at 06:00 — 20 out of 20 days.',
    ])
  })

  it('routine per item, best first, with the overall %', () => {
    expect(report.routine.items.map((i) => [i.title, Math.round((i.rate ?? 0) * 100)])).toEqual([
      ['Wake up at 06:00', 100],
      ['Morning workout', 100],
      ['Send 10 outreach messages', 95],
      ['Plan today’s top 3', 93],
      ['Read 20 pages', 87],
    ])
    expect(report.routine.overall).toBeCloseTo(0.9386, 4)
  })
})

describe('keyNumbers', () => {
  const numbers = keyNumbers(october())
  const byId = Object.fromEntries(numbers.map((n) => [n.id, n]))

  it('has 8 numbers in the design order', () => {
    expect(numbers.map((n) => n.label)).toEqual([
      'Tasks completed',
      'Money earned',
      'Trainings',
      'Hours worked',
      'Outreach sent',
      'Replies · meetings',
      'Deals won',
      'Routine done',
    ])
  })

  it('compares each with the previous month', () => {
    expect(byId.tasks).toMatchObject({ value: 128, delta: 9, showAs: 'abs' })
    expect(byId['metric-0']).toMatchObject({ value: 2200, unit: 'eur', showAs: 'pct' })
    expect(byId['metric-0']?.relative).toBeCloseTo(0.128, 3)
    expect(byId['metric-1']?.delta).toBe(-2)
    expect(byId['metric-2']).toMatchObject({ unit: 'hours', delta: -12 })
    expect(byId.outreach?.delta).toBe(14)
    expect(byId.replies?.extra).toMatchObject({ label: 'Meetings', value: 7, delta: 2 })
    expect(byId.deals).toMatchObject({ value: 1, detail: 'Café Rondo' })
    expect(byId.deals?.extra).toMatchObject({ unit: 'eur', value: 1500 })
  })

  it('fills up with routine % and streak when there are fewer metrics', () => {
    const labels = keyNumbers({ ...october(), metrics: [] }).map((n) => n.id)
    expect(labels).toEqual(['tasks', 'outreach', 'replies', 'deals', 'routine', 'streak'])
  })
})

describe('highlights', () => {
  it('only lists things that went up', () => {
    const list = highlights({ ...october(), routine: [], bestReplyRateBefore: 0.5 }, { kind: 'month', month: '2026-10' })
    // Money is still a record (milestone first); then the biggest increases:
    // meetings 5 → 7 (+40%), reply rate 15.9% → 18.8% (+18%). Outreach (+17%) just misses.
    expect(list).toEqual([
      'Best month yet for money earned: €2,200, up 13% on September.',
      '7 meetings booked, up 40% on September.',
      'Reply rate climbed to 18.8% from 15.9%.',
    ])
    expect(list.join(' ')).not.toMatch(/Trainings|Hours worked/)
  })

  it('skips reply rate with fewer than 30 sends', () => {
    const input = october()
    input.current = { ...input.current, outreachSent: 20, replies: 10 }
    expect(highlights(input, { kind: 'month', month: '2026-10' }).join(' ')).not.toContain('Reply rate')
  })

  it('with no previous period, only perfect months show', () => {
    const input = { ...october(), previous: null, metrics: [], routine: [{ title: 'Read 20 pages', done: 31, scheduled: 31 }] }
    expect(highlights(input, { kind: 'month', month: '2026-10' })).toEqual([
      'A perfect month for read 20 pages — 31 out of 31 days.',
    ])
    expect(keyNumbers(input)[0]).toMatchObject({ previous: null, delta: null, relative: null })
  })
})

describe('yearReport', () => {
  it('compares with last year', () => {
    const report = yearReport(2026, october())
    expect(report.title).toBe('2026')
    expect(report.share.heading).toBe('My 2026')
    expect(report.previousLabel).toBe('2025')
    expect(report.highlights).toContain('Best year yet for money earned: €2,200, up 13% on 2025.')
  })
})

describe('periods', () => {
  it('previous month crosses the year', () => {
    expect(previousMonth('2026-01')).toBe('2025-12')
    expect(previousMonth('2026-10')).toBe('2026-09')
  })

  it('month and year ranges', () => {
    expect(reportRange({ kind: 'month', month: '2028-02' })).toEqual({ from: '2028-02-01', to: '2028-02-29' })
    expect(reportRange({ kind: 'month', month: '2026-12' })).toEqual({ from: '2026-12-01', to: '2026-12-31' })
    expect(reportRange({ kind: 'year', year: 2026 })).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })
})
