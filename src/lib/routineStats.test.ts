import { describe, expect, it } from 'vitest'
import { addDays, dayIndex } from './dates'
import {
  bestRoutineMonth,
  missWeekdayPattern,
  overallRoutineRate,
  routineItemStats,
  routineTally,
  routineTrend,
  type RoutineMonth,
  type RoutineStatsCheck,
} from './routineStats'

const WEEKDAYS = [true, true, true, true, true, false, false]
const wake = { id: 'wake', title: 'Wake up at 06:00', days: WEEKDAYS, created_at: '2025-12-01T08:00:00Z' }

/**
 * Wake-up ticks from 1 Jan to 15 Mar 2026: done every weekday except
 * 5 Jan (Tired), 12 Jan (no answer), 20 Jan (Sick), 2 Feb (Tired), 16 Feb (unticked, no reason).
 */
function checks(): RoutineStatsCheck[] {
  const misses: Record<string, RoutineStatsCheck | null> = {
    '2026-01-05': { date: '2026-01-05', done: false, miss_reason: 'Tired' },
    '2026-01-12': null,
    '2026-01-20': { date: '2026-01-20', done: false, miss_reason: 'Sick' },
    '2026-02-02': { date: '2026-02-02', done: false, miss_reason: 'Tired' },
    '2026-02-16': { date: '2026-02-16', done: false, miss_reason: null },
  }
  const out: RoutineStatsCheck[] = []
  for (let date = '2026-01-01'; date <= '2026-03-15'; date = addDays(date, 1)) {
    if (dayIndex(date) > 4) continue
    if (date in misses) {
      const miss = misses[date]
      if (miss) out.push(miss)
    } else out.push({ date, done: true, miss_reason: null })
  }
  return out
}

const opts = { year: 2026, today: '2026-03-15' } // a Sunday

describe('routineItemStats', () => {
  const stats = routineItemStats(wake, checks(), opts)

  it('counts done, scheduled and missed so far', () => {
    expect(stats).toMatchObject({ done: 47, scheduled: 52, missed: 5 })
    expect(stats.rate).toBeCloseTo(47 / 52)
  })

  it('has a row per month with running totals (month-by-month table)', () => {
    expect(stats.months).toEqual([
      { month: '2026-01', scheduled: 22, done: 19, missed: 3, rate: 19 / 22, total: 19, perfectTotal: 22 },
      { month: '2026-02', scheduled: 20, done: 18, missed: 2, rate: 0.9, total: 37, perfectTotal: 42 },
      { month: '2026-03', scheduled: 10, done: 10, missed: 0, rate: 1, total: 47, perfectTotal: 52 },
    ])
  })

  it('has a perfect year of 261 weekdays, cumulative per month', () => {
    expect(stats.perfectYear).toBe(261)
    expect(stats.perfectLine).toHaveLength(12)
    expect(stats.perfectLine[0]).toEqual({ month: '2026-01', total: 22 })
    expect(stats.perfectLine[11]).toEqual({ month: '2026-12', total: 261 })
  })

  it('best month is March at 100%, this month 10 of 10', () => {
    expect(stats.bestMonth).toMatchObject({ month: '2026-03', rate: 1 })
    expect(stats.thisMonth).toEqual({ done: 10, scheduled: 10 })
  })

  it('forecasts the year at the last-3-months rate for the 209 days still to come', () => {
    // 12 weekdays left in March + 197 in Apr–Dec
    const pace = 47 / 52
    expect(stats.forecast?.pace).toBeCloseTo(pace)
    expect(stats.forecast?.total).toBeCloseTo(47 + 209 * pace, 4)
    expect(Math.round(stats.forecast?.total ?? 0)).toBe(236)
    expect(stats.forecast?.line).toHaveLength(10) // Mar … Dec
    expect(stats.forecast?.line[0]?.total).toBeCloseTo(47 + 12 * pace, 4)
  })

  it('lists miss reasons, "Not answered" last', () => {
    expect(stats.missReasons).toEqual([
      { reason: 'Tired', count: 2 },
      { reason: 'Sick', count: 1 },
      { reason: 'Not answered', count: 2 },
    ])
  })

  it('finds the weekday with most misses', () => {
    expect(stats.missWeekday).toEqual({ weekday: 0, misses: 4, sentence: 'Most misses are on Mondays (4 of 5).' })
  })

  it('has no trend with fewer than 4 months of data', () => {
    expect(stats.trend).toBeNull()
  })
})

describe('today and creation day', () => {
  it('today counts only once it is ticked or answered', () => {
    const monday = { year: 2026, today: '2026-03-16' }
    expect(routineItemStats(wake, checks(), monday).scheduled).toBe(52)
    const ticked = [...checks(), { date: '2026-03-16', done: true, miss_reason: null }]
    expect(routineItemStats(wake, ticked, monday)).toMatchObject({ scheduled: 53, done: 48 })
    const answered = [...checks(), { date: '2026-03-16', done: false, miss_reason: 'Travel' as const }]
    expect(routineItemStats(wake, answered, monday)).toMatchObject({ scheduled: 53, done: 47 })
  })

  it('days before the item existed are not scheduled', () => {
    const newer = { ...wake, created_at: '2026-02-10T08:00:00Z' }
    const stats = routineItemStats(newer, checks(), opts)
    expect(stats.months[0]).toMatchObject({ scheduled: 0, rate: null })
    expect(stats.months[1]).toMatchObject({ scheduled: 14, done: 13 }) // 10–27 Feb, 16 Feb missed
    expect(stats.perfectYear).toBe(261 - 22 - 6)
  })

  it('a past year shows all 12 months and no "this month"', () => {
    const stats = routineItemStats(wake, [], { year: 2025, today: '2026-03-15' })
    expect(stats.months).toHaveLength(12)
    expect(stats.thisMonth).toBeNull()
    expect(stats.scheduled).toBe(23) // December 2025 only (created 1 Dec)
    expect(stats.done).toBe(0)
    expect(stats.missReasons).toEqual([{ reason: 'Not answered', count: 23 }])
  })

  it('a future year is empty', () => {
    const stats = routineItemStats(wake, [], { year: 2027, today: '2026-03-15' })
    expect(stats.months).toEqual([])
    expect(stats.forecast).toBeNull()
  })
})

describe('routineTally', () => {
  it('counts one period, e.g. February', () => {
    expect(routineTally(wake, checks(), { from: '2026-02-01', to: '2026-02-28' }, '2026-03-15')).toEqual({
      done: 18,
      scheduled: 20,
    })
  })
})

// Done / scheduled per month from design/progress-routine.png (Jan–Oct).
const designMonths: RoutineMonth[] = [
  [16, 22],
  [17, 20],
  [19, 22],
  [18, 22],
  [20, 21],
  [19, 22],
  [14, 23],
  [18, 21],
  [21, 22],
  [20, 20],
].map(([done = 0, scheduled = 0], i) => ({
  month: `2026-${String(i + 1).padStart(2, '0')}`,
  done,
  scheduled,
  missed: scheduled - done,
  rate: done / scheduled,
  total: 0,
  perfectTotal: 0,
}))

describe('routineTrend', () => {
  it('is Improving for the design data (Aug–Oct 94% vs May–Jul 80%)', () => {
    expect(routineTrend(designMonths)).toBe('improving')
  })

  it('is Steady within 5 points and Slipping when worse', () => {
    const flat = designMonths.map((m) => ({ ...m, done: 18, scheduled: 20, rate: 0.9 }))
    expect(routineTrend(flat)).toBe('steady')
    expect(routineTrend([...designMonths].reverse())).toBe('slipping')
  })
})

describe('bestRoutineMonth', () => {
  it('is October 100% in the design', () => {
    expect(bestRoutineMonth(designMonths)?.month).toBe('2026-10')
  })

  it('on equal rates prefers more days done', () => {
    const tie = designMonths.slice(0, 2).map((m, i) => ({ ...m, rate: 1, done: i === 0 ? 10 : 12 }))
    expect(bestRoutineMonth(tie)?.month).toBe('2026-02')
  })
})

describe('missWeekdayPattern and overallRoutineRate', () => {
  it('says misses are spread out on a tie', () => {
    expect(missWeekdayPattern([2, 2, 0, 0, 1, 0, 0])).toMatchObject({ weekday: null })
    expect(missWeekdayPattern([0, 0, 0, 0, 0, 0, 0])).toBeNull()
  })

  it('pools all items (94% overall)', () => {
    expect(
      overallRoutineRate([
        { done: 20, scheduled: 20 },
        { done: 13, scheduled: 13 },
        { done: 19, scheduled: 20 },
        { done: 28, scheduled: 30 },
        { done: 27, scheduled: 31 },
      ]),
    ).toBeCloseTo(107 / 114)
    expect(overallRoutineRate([])).toBeNull()
  })
})
