import { describe, expect, it } from 'vitest'
import {
  bestReplyKey,
  findWakeItem,
  formatPercent,
  formatPercent1,
  funnelCounts,
  funnelPercents,
  insights,
  lowEnergyInsight,
  movingAverage7,
  periodCompare,
  periodRange,
  replyRate,
  replyRatesBy,
  replyWeekdayInsight,
  timedTasksInsight,
  wakeInsight,
  type InsightDay,
} from './stats'

describe('periodRange', () => {
  it('gives the last 30 days and the 30 before', () => {
    expect(periodRange('2026-10-28', 30)).toEqual({
      current: { from: '2026-09-29', to: '2026-10-28' },
      previous: { from: '2026-08-30', to: '2026-09-28' },
    })
  })

  it('7 days ends today', () => {
    expect(periodRange('2026-10-28', 7).current).toEqual({ from: '2026-10-22', to: '2026-10-28' })
  })
})

describe('periodCompare', () => {
  it('matches the KPI cards: +11 tasks, +6 pts completion, +3.1 pts reply rate', () => {
    expect(periodCompare(142, 131)).toMatchObject({ delta: 11 })
    expect(periodCompare(142, 131).relative).toBeCloseTo(0.084, 3)
    expect(periodCompare(0.75, 0.69).delta).toBe(0.06)
    expect(periodCompare(0.188, 0.157).delta).toBe(0.031)
  })

  it('has no % change from 0', () => {
    expect(periodCompare(7, 0)).toEqual({ value: 7, previous: 0, delta: 7, relative: null })
  })
})

describe('movingAverage7', () => {
  it('averages today and the 6 days before', () => {
    const result = movingAverage7([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(result[0]).toBe(1)
    expect(result[6]).toBe(4) // 1..7
    expect(result[9]).toBe(7) // 4..10
  })

  it('skips missing days', () => {
    expect(movingAverage7([null, 0.5, null, 1])).toEqual([null, 0.5, 0.5, 0.75])
  })
})

describe('funnel', () => {
  it('shows % of previous like the design (96 → 18 → 7 → 4 → 2)', () => {
    const rows = funnelPercents({ contacted: 96, replied: 18, meeting: 7, proposal: 4, won: 2 })
    expect(rows.map((r) => (r.ofPrevious === null ? null : formatPercent(r.ofPrevious)))).toEqual([
      null,
      '19%',
      '39%',
      '57%',
      '50%',
    ])
    expect(rows[4]?.ofStart).toBeCloseTo(2 / 96)
  })

  it('handles an empty funnel', () => {
    const rows = funnelPercents({ contacted: 0, replied: 0, meeting: 0, proposal: 0, won: 0 })
    expect(rows.every((r) => r.ofPrevious === null && r.ofStart === null)).toBe(true)
  })

  it('counts leads that skipped stages for the stages before', () => {
    const counts = funnelCounts([
      { contact_id: 'a', stage: 'new' },
      { contact_id: 'a', stage: 'contacted' },
      { contact_id: 'b', stage: 'contacted' },
      { contact_id: 'b', stage: 'replied' },
      { contact_id: 'c', stage: 'meeting' }, // met in person, straight to a meeting
      { contact_id: 'c', stage: 'lost' },
      { contact_id: 'd', stage: 'new' },
    ])
    expect(counts).toEqual({ contacted: 3, replied: 2, meeting: 1, proposal: 0, won: 0 })
  })
})

describe('reply rate', () => {
  it('is 18.8% for 18 of 96, and too few to judge under 30 sends', () => {
    const rate = replyRate(96, 18)
    expect(formatPercent1(rate.rate ?? 0)).toBe('18.8%')
    expect(rate.tooFew).toBe(false)
    expect(replyRate(29, 7).tooFew).toBe(true)
    expect(replyRate(0, 0).rate).toBeNull()
  })

  it('groups by channel, best first, faded under 30 sends (design numbers)', () => {
    const sends = (key: string, sent: number, replies: number) =>
      Array.from({ length: sent }, (_, i) => ({ key, got_reply: i < replies }))
    const rates = replyRatesBy([
      ...sends('email', 48, 6),
      ...sends('phone', 5, 2),
      ...sends('linkedin', 29, 7),
      ...sends('instagram', 14, 3),
    ])
    expect(rates.map((r) => [r.key, formatPercent1(r.rate ?? 0), r.tooFew])).toEqual([
      ['phone', '40%', true],
      ['linkedin', '24.1%', true],
      ['instagram', '21.4%', true],
      ['email', '12.5%', false],
    ])
  })

  it('"Best" template ignores ones with too few sends', () => {
    const sends = (key: string, sent: number, replies: number) =>
      Array.from({ length: sent }, (_, i) => ({ key, got_reply: i < replies }))
    const templates = replyRatesBy([
      ...sends('Opener A', 41, 9),
      ...sends('Follow-up #1', 13, 2),
      ...sends('Opener B', 37, 5),
      ...sends('Phone script', 5, 2),
    ])
    expect(templates[0]?.key).toBe('Phone script') // 40%, but only 5 sends
    expect(bestReplyKey(templates)).toBe('Opener A') // 22%
    expect(bestReplyKey([])).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

function day(overrides: Partial<InsightDay>): InsightDay {
  return { date: '2026-10-01', wakeDone: null, tasksDone: 0, tasksTotal: 0, energy: null, outreachSent: 0, ...overrides }
}

/** 10 woke-up days (84 of 100 tasks), 10 late days (64 of 100), 3 days without the routine. */
function wakeDays(): InsightDay[] {
  const woke = [9, 9, 9, 9, 8, 8, 8, 8, 8, 8].map((done) => day({ wakeDone: true, tasksDone: done, tasksTotal: 10 }))
  const late = [7, 7, 7, 7, 6, 6, 6, 6, 6, 6].map((done) => day({ wakeDone: false, tasksDone: done, tasksTotal: 10 }))
  const weekend = [1, 2, 3].map(() => day({ wakeDone: null, tasksDone: 1, tasksTotal: 1 }))
  return [...woke, ...late, ...weekend]
}

describe('wakeInsight', () => {
  it('"you finish 31% more tasks" (84% vs 64%)', () => {
    expect(wakeInsight(wakeDays(), 'Wake up at 06:00')).toEqual({
      id: 'wake',
      title: 'On days you wake up at 06:00 you finish 31% more tasks.',
      detail: '84% completion vs 64% on late days · based on 20 days',
    })
  })

  it('says "fewer" when waking up early goes with less done', () => {
    const swapped = wakeDays().map((d) => (d.wakeDone === null ? d : { ...d, wakeDone: !d.wakeDone }))
    expect(wakeInsight(swapped, 'Wake up at 06:00')?.title).toBe(
      'On days you wake up at 06:00 you finish 24% fewer tasks.',
    )
  })

  it('needs a wake-up item and 5 days on each side', () => {
    expect(wakeInsight(wakeDays(), null)).toBeNull()
    expect(wakeInsight(wakeDays().slice(6), 'Wake up at 06:00')).toBeNull() // only 4 woke days
  })

  it('finds the wake-up routine item by title', () => {
    const items = [{ title: 'Read 20 pages' }, { title: 'Wake up at 06:00' }]
    expect(findWakeItem(items)?.title).toBe('Wake up at 06:00')
    expect(findWakeItem([{ title: 'Awakening yoga' }])).toBeNull()
  })
})

describe('replyWeekdayInsight', () => {
  const sends = (occurred_at: string, sent: number, replies: number) =>
    Array.from({ length: sent }, (_, i) => ({ occurred_at, got_reply: i < replies }))

  it('"Tuesday get the most replies (27%)", Mondays lowest at 11%', () => {
    const messages = [
      ...sends('2026-10-26T09:00:00Z', 9, 1), // Monday
      ...sends('2026-10-27T09:00:00Z', 11, 3), // Tuesday
      ...sends('2026-10-28T09:00:00Z', 4, 4), // Wednesday: too few sends to count
    ]
    expect(replyWeekdayInsight(messages)).toEqual({
      id: 'replyWeekday',
      title: 'Messages sent on Tuesday get the most replies (27%).',
      detail: 'Mondays are lowest at 11% · consider batching outreach on Tuesdays',
    })
  })

  it('uses the Sarajevo day: 23:30 UTC Monday is already Tuesday', () => {
    const messages = [...sends('2026-10-26T23:30:00Z', 5, 5), ...sends('2026-10-28T09:00:00Z', 5, 0)]
    expect(replyWeekdayInsight(messages)?.title).toContain('on Tuesday')
  })

  it('needs two weekdays with enough sends', () => {
    expect(replyWeekdayInsight(sends('2026-10-27T09:00:00Z', 20, 5))).toBeNull()
  })
})

describe('timedTasksInsight', () => {
  const tasks = (time: string | null, total: number, done: number) =>
    Array.from({ length: total }, (_, i) => ({ time, status: i < done ? ('done' as const) : ('todo' as const) }))

  it('"get done 1.6× more often" (91% vs 57%)', () => {
    expect(timedTasksInsight([...tasks('10:00:00', 11, 10), ...tasks(null, 14, 8)])).toEqual({
      id: 'timedTasks',
      title: 'Tasks with a set time get done 1.6× more often.',
      detail: '91% vs 57% for “anytime” tasks',
    })
  })

  it('turns around when anytime tasks do better', () => {
    expect(timedTasksInsight([...tasks('10:00:00', 10, 4), ...tasks(null, 10, 8)])?.title).toBe(
      '“Anytime” tasks get done 2× more often than timed ones.',
    )
  })

  it('needs 10 tasks in each group', () => {
    expect(timedTasksInsight([...tasks('10:00:00', 9, 9), ...tasks(null, 20, 5)])).toBeNull()
  })
})

describe('lowEnergyInsight', () => {
  it('"cut your outreach in half" (6 vs 12 on average)', () => {
    const days = [
      ...[1, 2, 2].map((energy) => day({ energy, outreachSent: 6 })),
      ...[3, 4, 5].map((energy) => day({ energy, outreachSent: 18 })),
      day({ energy: null, outreachSent: 40 }), // no energy logged: left out
    ]
    expect(lowEnergyInsight(days)).toEqual({
      id: 'lowEnergy',
      title: 'Low-energy days cut your outreach in half.',
      detail: '6 messages on energy 1–2 days vs 12 on average',
    })
  })

  it('says by how much otherwise', () => {
    const days = [...[1, 1, 2].map((energy) => day({ energy, outreachSent: 8 })), day({ energy: 4, outreachSent: 16 })]
    // low 8 vs average 10 → 20% less
    expect(lowEnergyInsight(days)?.title).toBe('Low-energy days cut your outreach by 20%.')
  })

  it('needs 3 low-energy days', () => {
    expect(lowEnergyInsight([day({ energy: 1, outreachSent: 2 }), day({ energy: 4, outreachSent: 9 })])).toBeNull()
  })
})

describe('insights', () => {
  it('returns the sentences in a fixed order and leaves out ones without data', () => {
    const result = insights({ days: wakeDays(), wakeTitle: 'Wake up at 06:00', sentMessages: [], tasks: [] })
    expect(result.map((i) => i.id)).toEqual(['wake'])
  })
})
