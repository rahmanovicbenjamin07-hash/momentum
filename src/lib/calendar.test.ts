import { describe, expect, it } from 'vitest'
import { addMonths, clampDate, monthGrid, monthStart, sameMonth, shiftMonths } from './calendar'

describe('calendar', () => {
  it('finds the first of the month and moves by months across years', () => {
    expect(monthStart('2026-10-28')).toBe('2026-10-01')
    expect(addMonths('2026-10-28', 1)).toBe('2026-11-01')
    expect(addMonths('2026-12-05', 1)).toBe('2027-01-01')
    expect(addMonths('2026-01-31', -1)).toBe('2025-12-01')
    expect(addMonths('2026-10-01', -22)).toBe('2024-12-01')
  })

  it('compares months', () => {
    expect(sameMonth('2026-10-01', '2026-10-31')).toBe(true)
    expect(sameMonth('2026-10-31', '2026-11-01')).toBe(false)
  })

  it('builds a 6-week grid starting Monday (or Sunday)', () => {
    const grid = monthGrid('2026-10-15')
    expect(grid).toHaveLength(42)
    // 1 Oct 2026 is a Thursday, so the grid starts on Monday 28 Sep.
    expect(grid[0]).toBe('2026-09-28')
    expect(grid[3]).toBe('2026-10-01')
    expect(grid[41]).toBe('2026-11-08')
    expect(monthGrid('2026-10-15', 0)[0]).toBe('2026-09-27')
  })

  it('clamps to min and max', () => {
    expect(clampDate('2026-10-01', '2026-10-05')).toBe('2026-10-05')
    expect(clampDate('2026-10-30', undefined, '2026-10-28')).toBe('2026-10-28')
    expect(clampDate('2026-10-10', '2026-10-05', '2026-10-28')).toBe('2026-10-10')
  })

  it('shifts a day by months, keeping it inside short months', () => {
    expect(shiftMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(shiftMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(shiftMonths('2026-10-15', -1)).toBe('2026-09-15')
    expect(shiftMonths('2026-12-15', 1)).toBe('2027-01-15')
  })
})
