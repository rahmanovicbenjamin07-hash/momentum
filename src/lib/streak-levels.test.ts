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

/** WCAG contrast ratio between two "#RRGGBB" colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

describe('level text colours', () => {
  it.each(STREAK_LEVELS.map((l) => [l.name, l] as const))('%s text passes AA on white, core and tint', (_, level) => {
    for (const bg of ['#FFFFFF', level.colors.core, level.colors.tint]) {
      expect(contrast(level.textColor, bg)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
