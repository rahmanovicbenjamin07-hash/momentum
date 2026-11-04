import { describe, expect, it } from 'vitest'
import { addDays, type DateKey } from './dates'
import {
  computeStreak,
  dayCounts,
  getStreakTier,
  legendMilestoneAfter,
  longestStreak,
  streakDaysFromTotals,
  type StreakDay,
} from './streak'

/**
 * Builds StreakDays ending on `last`, oldest first.
 * 'y' = all done, 'n' = missed (1 of 2 done), '-' = nothing planned.
 */
function history(last: DateKey, pattern: string): StreakDay[] {
  const chars = [...pattern]
  return chars.map((c, i) => {
    const date = addDays(last, i - (chars.length - 1))
    if (c === '-') return { date, scheduled: 0, done: 0 }
    return { date, scheduled: 2, done: c === 'y' ? 2 : 1 }
  })
}

const WED = '2026-10-28'

describe('dayCounts', () => {
  it('needs at least 90% done', () => {
    expect(dayCounts({ date: WED, scheduled: 10, done: 9 })).toBe(true)
    expect(dayCounts({ date: WED, scheduled: 10, done: 8 })).toBe(false)
    expect(dayCounts({ date: WED, scheduled: 30, done: 27 })).toBe(true)
    expect(dayCounts({ date: WED, scheduled: 5, done: 4 })).toBe(false) // 80%
    expect(dayCounts({ date: WED, scheduled: 5, done: 5 })).toBe(true)
  })

  it('a day with nothing planned does not count', () => {
    expect(dayCounts({ date: WED, scheduled: 0, done: 0 })).toBe(false)
  })
})

describe('computeStreak', () => {
  it('counts consecutive days ending today', () => {
    const result = computeStreak(history(WED, 'yyyyy'), WED)
    expect(result).toEqual({ days: 5, todayCounted: true, lastCountedDate: WED })
  })

  it('an unfinished today does not break the streak (ends yesterday)', () => {
    const result = computeStreak(history(WED, 'yyyn'), WED)
    expect(result.days).toBe(3)
    expect(result.todayCounted).toBe(false)
    expect(result.lastCountedDate).toBe('2026-10-27')
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

  it('a day under 90% ends the streak (no rest days)', () => {
    expect(computeStreak(history(WED, 'yyyyyyyyny'), WED).days).toBe(1)
    expect(computeStreak(history(WED, 'yyyyyyyynn'), WED).days).toBe(0)
  })

  it('days with nothing planned are skipped: they neither add nor break', () => {
    expect(computeStreak(history(WED, 'yy--yyy'), WED).days).toBe(5)
    expect(computeStreak(history(WED, 'yy-'), WED).days).toBe(2)
  })
})

describe('streakDaysFromTotals', () => {
  it('maps daily totals to streak days', () => {
    expect(streakDaysFromTotals([{ day: WED, total: 10, done: 9 }])).toEqual([{ date: WED, scheduled: 10, done: 9 }])
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
  it('finds the best run; any day under 90% breaks it', () => {
    expect(longestStreak(history(WED, 'yyynnyyyyy'))).toBe(5)
    expect(longestStreak(history(WED, 'yyyyyyynyy'))).toBe(7)
  })

  it('skips days with nothing planned', () => {
    expect(longestStreak(history(WED, 'yy--yy'))).toBe(4)
  })

  it('is 0 with nothing done', () => {
    expect(longestStreak([])).toBe(0)
    expect(longestStreak(history(WED, 'nn'))).toBe(0)
  })
})
