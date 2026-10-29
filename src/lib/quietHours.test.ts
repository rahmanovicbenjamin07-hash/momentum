import { describe, expect, it } from 'vitest'
import { isQuiet } from './quietHours'

describe('isQuiet', () => {
  it('across midnight (22:00–06:00)', () => {
    expect(isQuiet('23:30', '22:00', '06:00')).toBe(true)
    expect(isQuiet('22:00', '22:00', '06:00')).toBe(true) // the start counts
    expect(isQuiet('00:00', '22:00', '06:00')).toBe(true)
    expect(isQuiet('05:59', '22:00', '06:00')).toBe(true)
    expect(isQuiet('06:00', '22:00', '06:00')).toBe(false) // the end doesn't
    expect(isQuiet('12:00', '22:00', '06:00')).toBe(false)
    expect(isQuiet('21:59', '22:00', '06:00')).toBe(false)
  })

  it('within one day (13:00–14:00)', () => {
    expect(isQuiet('13:30', '13:00', '14:00')).toBe(true)
    expect(isQuiet('13:00', '13:00', '14:00')).toBe(true)
    expect(isQuiet('14:00', '13:00', '14:00')).toBe(false)
    expect(isQuiet('12:59', '13:00', '14:00')).toBe(false)
  })

  it('from === to is never quiet', () => {
    expect(isQuiet('22:00', '22:00', '22:00')).toBe(false)
    expect(isQuiet('03:00', '00:00', '00:00')).toBe(false)
  })
})
