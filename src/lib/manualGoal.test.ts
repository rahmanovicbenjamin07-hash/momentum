import { describe, expect, it } from 'vitest'
import { DAYS_PER_MONTH } from './forecast'
import { manualProgress } from './manualGoal'

const base = { startDate: '2026-05-01', startValue: 3000, today: '2026-10-28' }

describe('manualProgress', () => {
  it('with no updates: stands at the starting point, no pace', () => {
    expect(manualProgress({ ...base, updates: [] })).toEqual({
      current: 3000,
      pace: 0,
      points: [
        { date: '2026-05-01', value: 3000 },
        { date: '2026-10-28', value: 3000 },
      ],
      lastUpdate: null,
    })
  })

  it('uses the latest update and sorts them by date', () => {
    const result = manualProgress({
      ...base,
      updates: [
        { date: '2026-10-01', value: 5000 },
        { date: '2026-06-01', value: 3500 },
      ],
    })
    expect(result.current).toBe(5000)
    expect(result.lastUpdate).toBe('2026-10-01')
    expect(result.points.map((p) => p.date)).toEqual(['2026-05-01', '2026-06-01', '2026-10-01', '2026-10-28'])
  })

  it('pace looks back about 3 months from the latest update', () => {
    // 1 Jul → 1 Oct is 92 days (≥ 91): €4,000 → €5,000.
    const result = manualProgress({
      ...base,
      updates: [
        { date: '2026-06-01', value: 3500 },
        { date: '2026-07-01', value: 4000 },
        { date: '2026-10-01', value: 5000 },
      ],
    })
    expect(result.pace).toBeCloseTo(1000 / (92 / DAYS_PER_MONTH), 6)
  })

  it('falls back to the start when there is less than 3 months of history', () => {
    const result = manualProgress({ ...base, updates: [{ date: '2026-06-01', value: 4000 }] })
    expect(result.pace).toBeCloseTo(1000 / (31 / DAYS_PER_MONTH), 6)
  })

  it('needs at least a week of history for a pace', () => {
    expect(manualProgress({ ...base, updates: [{ date: '2026-05-05', value: 3500 }] }).pace).toBe(0)
  })

  it('a falling value gives a negative pace', () => {
    expect(manualProgress({ ...base, updates: [{ date: '2026-06-01', value: 2000 }] }).pace).toBeLessThan(0)
  })

  it('ignores updates before the start or after today, and does not add today twice', () => {
    const result = manualProgress({
      ...base,
      updates: [
        { date: '2026-04-01', value: 1 },
        { date: '2026-10-28', value: 6000 },
        { date: '2026-11-01', value: 9 },
      ],
    })
    expect(result.current).toBe(6000)
    expect(result.points).toEqual([
      { date: '2026-05-01', value: 3000 },
      { date: '2026-10-28', value: 6000 },
    ])
  })
})
