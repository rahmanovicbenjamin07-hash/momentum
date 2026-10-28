import { describe, expect, it } from 'vitest'
import { getStreakLevel, STREAK_LEVELS, streakLevelForDays } from './streak-levels'

describe('streakLevelForDays', () => {
  it.each([
    [0, 'start'],
    [1, 'spark'],
    [9, 'spark'],
    [10, 'flame'],
    [29, 'flame'],
    [30, 'blaze'],
    [59, 'blaze'],
    [60, 'inferno'],
    [99, 'inferno'],
    [100, 'legend'],
    [365, 'legend'],
  ])('%i days → %s', (days, id) => {
    expect(streakLevelForDays(days).id).toBe(id)
  })

  it('treats negative, fractional and NaN input safely', () => {
    expect(streakLevelForDays(-3).id).toBe('start')
    expect(streakLevelForDays(Number.NaN).id).toBe('start')
    expect(streakLevelForDays(9.9).id).toBe('spark')
  })
})

describe('STREAK_LEVELS', () => {
  it('has six levels in rising order', () => {
    expect(STREAK_LEVELS).toHaveLength(6)
    const mins = STREAK_LEVELS.map((l) => l.minDays)
    expect(mins).toEqual([...mins].sort((a, b) => a - b))
  })

  it('only Inferno and Legend have sparkles', () => {
    expect(STREAK_LEVELS.filter((l) => l.sparkles).map((l) => l.id)).toEqual(['inferno', 'legend'])
  })

  it('looks a level up by id', () => {
    expect(getStreakLevel('blaze').colors.outer).toBe('#E11D48')
  })
})
