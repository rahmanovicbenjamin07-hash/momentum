import { describe, expect, it } from 'vitest'
import { addDays, type DateKey } from './dates'
import {
  buildStreakDays,
  computeStreak,
  getStreakTier,
  legendMilestoneAfter,
  longestStreak,
  type StreakDay,
  type StreakRoutineItem,
} from './streak'

/**
 * Builds StreakDays ending on `last`, oldest first.
 * 'y' = all done, 'n' = missed (1 of 2 done), '-' = nothing scheduled.
 */
function history(last: DateKey, pattern: string): StreakDay[] {
  const chars = [...pattern]
  return chars.map((c, i) => {
    const date = addDays(last, i - (chars.length - 1))
    if (c === '-') return { date, scheduled: 0, done: 0 }
    return { date, scheduled: 2, done: c === 'y' ? 2 : 1 }
  })
}

// Week of 19–25 Oct 2026 and 26 Oct (Mon) – 1 Nov (Sun).
const WED = '2026-10-28'

describe('computeStreak', () => {
  it('counts consecutive complete days ending today', () => {
    const result = computeStreak(history(WED, 'yyyyy'), WED)
    expect(result).toEqual({ days: 5, todayCounted: true, lastCountedDate: WED, forgivenDates: [] })
  })

  it('an unfinished today does not break the streak (ends yesterday)', () => {
    const result = computeStreak(history(WED, 'yyyn'), WED)
    expect(result.days).toBe(3)
    expect(result.todayCounted).toBe(false)
    expect(result.lastCountedDate).toBe('2026-10-27')
    expect(result.forgivenDates).toEqual([])
  })

  it('is 0 with no data, or when only today is unfinished', () => {
    expect(computeStreak([], WED).days).toBe(0)
    const onlyToday = computeStreak(history(WED, 'n'), WED)
    expect(onlyToday.days).toBe(0)
    expect(onlyToday.lastCountedDate).toBeNull()
  })

  it('stops where tracking started', () => {
    expect(computeStreak(history(WED, 'yy'), WED).days).toBe(2)
  })

  describe('rest days (one missed day per Mon–Sun week)', () => {
    it('forgives one miss in a week; the rest day bridges but does not add', () => {
      // 19–25 Oct all done, Mon 26 done, Tue 27 missed, Wed 28 done
      const result = computeStreak(history(WED, 'yyyyyyyyny'), WED)
      expect(result.days).toBe(9)
      expect(result.forgivenDates).toEqual(['2026-10-27'])
    })

    it('a second miss in the same week ends the streak', () => {
      // Mon 26 missed, Tue 27 missed, Wed 28 done
      const result = computeStreak(history(WED, 'yyyyyyynny'), WED)
      expect(result.days).toBe(1)
      expect(result.forgivenDates).toEqual([])
    })

    it('forgives one miss in each of two different weeks', () => {
      // Thu 22 missed (week of 19th), Tue 27 missed (week of 26th)
      const result = computeStreak(history(WED, 'yyynyyyyny'), WED)
      expect(result.days).toBe(8)
      expect(result.forgivenDates).toEqual(['2026-10-27', '2026-10-22'])
    })

    it('two misses in one earlier week end the streak there', () => {
      // Tue 20 and Thu 22 missed (same week), then all done
      const result = computeStreak(history(WED, 'ynynyyyyyy'), WED)
      // Counts 28 → 23 (6), forgives 22, counts 21 (7), stops at the second miss on 20.
      expect(result.days).toBe(7)
      expect(result.forgivenDates).toEqual(['2026-10-22'])
    })

    it('a missed yesterday is forgiven while today is still open', () => {
      // 19–25 done, Mon 26 done, Tue 27 missed, Wed 28 not done yet
      const result = computeStreak(history(WED, 'yyyyyyyynn'), WED)
      expect(result.days).toBe(8)
      expect(result.todayCounted).toBe(false)
      expect(result.lastCountedDate).toBe('2026-10-26')
      expect(result.forgivenDates).toEqual(['2026-10-27'])
    })

    it('misses on Sunday and the next Monday fall in different weeks, so both are forgiven', () => {
      const TUE = '2026-10-27'
      // Fri 23, Sat 24 done; Sun 25 missed; Mon 26 missed; Tue 27 done
      const result = computeStreak(history(TUE, 'yynny'), TUE)
      expect(result.days).toBe(3)
      expect(result.forgivenDates).toEqual(['2026-10-26', '2026-10-25'])
    })

    it('does not report a rest day with no counted day before it', () => {
      // Tracking starts with a miss on Mon 26
      const result = computeStreak(history(WED, 'nyy'), WED)
      expect(result.days).toBe(2)
      expect(result.forgivenDates).toEqual([])
    })
  })

  it('days with nothing scheduled count', () => {
    // Sat 24, Sun 25 have nothing scheduled
    const result = computeStreak(history(WED, 'yy--yyy'), WED)
    expect(result.days).toBe(7)
  })
})

describe('buildStreakDays', () => {
  const weekdays = [true, true, true, true, true, false, false]
  const items: StreakRoutineItem[] = [
    { id: 'wake', days: weekdays, active: true, createdOn: '2026-10-23' },
    { id: 'read', days: Array(7).fill(true), active: true, createdOn: '2026-10-27' },
    { id: 'old', days: Array(7).fill(true), active: false, createdOn: '2026-10-01' },
  ]
  const checks = [
    { routine_item_id: 'wake', date: '2026-10-23', done: true },
    { routine_item_id: 'wake', date: '2026-10-26', done: true },
    { routine_item_id: 'wake', date: '2026-10-27', done: true },
    { routine_item_id: 'read', date: '2026-10-27', done: false },
    { routine_item_id: 'old', date: '2026-10-27', done: true },
  ]

  it('summarises each day from the first active item to today', () => {
    expect(buildStreakDays(items, checks, WED)).toEqual([
      { date: '2026-10-23', scheduled: 1, done: 1 }, // Fri
      { date: '2026-10-24', scheduled: 0, done: 0 }, // Sat
      { date: '2026-10-25', scheduled: 0, done: 0 }, // Sun
      { date: '2026-10-26', scheduled: 1, done: 1 }, // Mon ('read' not created yet)
      { date: '2026-10-27', scheduled: 2, done: 1 }, // Tue (check done: false doesn't count)
      { date: '2026-10-28', scheduled: 2, done: 0 }, // Wed
    ])
  })

  it('returns nothing without active items', () => {
    expect(buildStreakDays([], [], WED)).toEqual([])
    expect(buildStreakDays([{ ...items[2]! }], checks, WED)).toEqual([])
  })

  it('feeds computeStreak end to end', () => {
    // 23–26 count, 27 missed (forgiven), 28 still open → 4 days
    const result = computeStreak(buildStreakDays(items, checks, WED), WED)
    expect(result.days).toBe(4)
    expect(result.forgivenDates).toEqual(['2026-10-27'])
  })
})

describe('getStreakTier', () => {
  const cases: Array<[days: number, level: string, next: string, atDays: number, toNext: number, progress: number]> = [
    [0, 'Start', 'Spark', 1, 1, 0],
    [1, 'Spark', 'Flame', 10, 9, 0],
    [9, 'Spark', 'Flame', 10, 1, 8 / 9],
    [10, 'Flame', 'Blaze', 30, 20, 0],
    [12, 'Flame', 'Blaze', 30, 18, 2 / 20], // design: "18 days to Blaze"
    [29, 'Flame', 'Blaze', 30, 1, 19 / 20],
    [30, 'Blaze', 'Inferno', 60, 30, 0],
    [59, 'Blaze', 'Inferno', 60, 1, 29 / 30],
    [60, 'Inferno', 'Legend', 100, 40, 0],
    [99, 'Inferno', 'Legend', 100, 1, 39 / 40],
    [100, 'Legend', '150 days', 150, 50, 0],
    [150, 'Legend', '200 days', 200, 50, 0],
    [199, 'Legend', '200 days', 200, 1, 49 / 50],
    [200, 'Legend', '365 days', 365, 165, 0],
    [365, 'Legend', '730 days', 730, 365, 0],
    [400, 'Legend', '730 days', 730, 330, 35 / 365],
  ]

  it.each(cases)('%i days → %s, next %s at %i', (days, level, next, atDays, toNext, progress) => {
    const tier = getStreakTier(days)
    expect(tier.level.name).toBe(level)
    expect(tier.nextLevel.name).toBe(next)
    expect(tier.nextLevel.atDays).toBe(atDays)
    expect(tier.daysToNext).toBe(toNext)
    expect(tier.progress).toBeCloseTo(progress, 10)
  })

  it('marks post-Legend targets as milestones', () => {
    expect(getStreakTier(99).nextLevel.isMilestone).toBe(false)
    expect(getStreakTier(100).nextLevel.isMilestone).toBe(true)
  })

  it('returns the level colours and sparkles', () => {
    expect(getStreakTier(0).colors).toEqual({ outer: '#9CA3AF', middle: '#D1D5DB', core: '#F3F4F6', tint: '#F3F4F6' })
    expect(getStreakTier(12).colors.outer).toBe('#F97316')
    expect(getStreakTier(59).sparkles).toBe(false)
    expect(getStreakTier(60).sparkles).toBe(true)
    expect(getStreakTier(100).sparkles).toBe(true)
  })

  it('treats negative, fractional and broken input safely', () => {
    expect(getStreakTier(-5).level.name).toBe('Start')
    expect(getStreakTier(Number.NaN).level.name).toBe('Start')
    expect(getStreakTier(9.9).level.name).toBe('Spark')
  })
})

describe('legendMilestoneAfter', () => {
  it('goes 150, 200, 365, then every 365 days', () => {
    expect(legendMilestoneAfter(100)).toBe(150)
    expect(legendMilestoneAfter(149)).toBe(150)
    expect(legendMilestoneAfter(150)).toBe(200)
    expect(legendMilestoneAfter(364)).toBe(365)
    expect(legendMilestoneAfter(365)).toBe(730)
    expect(legendMilestoneAfter(729)).toBe(730)
    expect(legendMilestoneAfter(730)).toBe(1095)
  })
})

describe('longestStreak', () => {
  it('finds the best run, with one forgiven day per week', () => {
    // 19–28 Oct: two misses in the week of 19–25 Oct break it; the run after is 24–28 Oct.
    expect(longestStreak(history(WED, 'yyynnyyyyy'))).toBe(5)
    // One miss on Mon 26 Oct is forgiven: 19–28 Oct counts 9 days.
    expect(longestStreak(history(WED, 'yyyyyyynyy'))).toBe(9)
  })

  it('is 0 with nothing done', () => {
    expect(longestStreak([])).toBe(0)
    expect(longestStreak(history(WED, 'nn'))).toBe(0)
  })
})
