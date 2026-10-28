import { describe, expect, it } from 'vitest'
import type { WeekDayProgress } from './progress'
import { getStreakTier } from './streak'
import { daysLabel, goalPercent, outreachCaption, streakCaption, weekCellTone, weekSoFarLabel } from './todayCards'

describe('streakCaption', () => {
  it.each([
    [0, 'Finish today’s routine to start one'],
    [5, '5 days to Flame'],
    [9, '1 day to Flame'],
    [18, '12 days to Blaze'],
    [42, '18 days to Inferno'],
    [75, '25 days to Legend'],
    [120, 'Next milestone: 150 days'],
  ])('%i days → %s', (days, text) => {
    expect(streakCaption(days, getStreakTier(days))).toBe(text)
  })
})

describe('daysLabel', () => {
  it('uses singular for 1', () => {
    expect(daysLabel(1)).toBe('1 day')
    expect(daysLabel(0)).toBe('0 days')
  })
})

describe('outreachCaption', () => {
  it('matches the design and handles edges', () => {
    expect(outreachCaption(11, 20, 3)).toBe('3 replies so far · 9 more to hit your goal')
    expect(outreachCaption(0, 20, 0)).toBe('No replies yet · 20 more to hit your goal')
    expect(outreachCaption(19, 20, 1)).toBe('1 reply so far · 1 more to hit your goal')
    expect(outreachCaption(24, 20, 6)).toBe('6 replies so far · goal reached')
  })
})

describe('goalPercent', () => {
  it('rounds and caps at 0–100', () => {
    expect(goalPercent(11, 20)).toBe(55)
    expect(goalPercent(30, 20)).toBe(100)
    expect(goalPercent(5, 0)).toBe(0)
  })
})

function week(todayIndex: number): WeekDayProgress[] {
  return Array.from({ length: 7 }, (_, i) => ({
    date: `2026-10-${26 + i}`,
    done: 0,
    total: 0,
    percent: null,
    isToday: i === todayIndex,
    isFuture: i > todayIndex,
  }))
}

describe('weekSoFarLabel', () => {
  it('goes from Monday to today', () => {
    expect(weekSoFarLabel(week(2))).toBe('Mon–Wed')
    expect(weekSoFarLabel(week(0))).toBe('Mon')
    expect(weekSoFarLabel(week(6))).toBe('Mon–Sun')
  })
})

describe('weekCellTone', () => {
  it.each([
    [null, 'empty'],
    [0, 'low'],
    [39, 'low'],
    [45, 'mid'],
    [86, 'high'],
    [92, 'top'],
    [100, 'top'],
  ] as const)('%s → %s', (percent, tone) => {
    expect(weekCellTone(percent)).toBe(tone)
  })
})
