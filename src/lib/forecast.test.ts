import { describe, expect, it } from 'vitest'
import { goalStatus, levelForecast, pipelineExpected, recentPace, totalForecast, type MonthValue } from './forecast'

const TODAY = '2026-10-29'
const DEADLINE = '2026-12-31'

// Jul–Sep average to €2,025; October isn't over yet, so it doesn't count.
const months: MonthValue[] = [
  { month: '2026-06', value: 1500 },
  { month: '2026-07', value: 1800 },
  { month: '2026-08', value: 2000 },
  { month: '2026-09', value: 2275 },
  { month: '2026-10', value: 2200 },
]

const base = { months, current: 13950, target: 18000, today: TODAY, deadline: DEADLINE }

describe('recentPace', () => {
  it('averages the last 3 complete months', () => {
    expect(recentPace(months, TODAY)).toBe(2025)
  })

  it('uses fewer months when fewer exist, 0 when none', () => {
    expect(recentPace([{ month: '2026-09', value: 2500 }, { month: '2026-08', value: 1500 }], TODAY)).toBe(2000)
    expect(recentPace([{ month: '2026-10', value: 900 }], TODAY)).toBe(0)
    expect(recentPace([], TODAY)).toBe(0)
  })
})

describe('totalForecast', () => {
  it('€13,950 of €18,000 at €2,025 a month finishes on 29 Dec 2026', () => {
    const f = totalForecast(base)
    expect(f).toMatchObject({ pace: 2025, finishDate: '2026-12-29', daysEarly: 2, reached: false })
    // €4,050 left over 63 days (2.07 months)
    expect(f.neededPace).toBeCloseTo(4050 / (63 / 30.4375), 6)
    expect(goalStatus(f)).toBe('on_track')
  })

  it('counts the pipeline as already done', () => {
    // €15,250 → €2,750 left → 41 days
    expect(totalForecast({ ...base, pipeline: 1300 })).toMatchObject({ finishDate: '2026-12-09', daysEarly: 22 })
    const reached = totalForecast({ ...base, pipeline: 4050 })
    expect(reached).toMatchObject({ reached: true, finishDate: TODAY, neededPace: 0 })
    expect(goalStatus(reached)).toBe('reached')
  })

  it('paceOverride replaces the 3-month pace', () => {
    // €4,050 at €4,050 a month = 30.4375 days → 30
    expect(totalForecast({ ...base, paceOverride: 4050 })).toMatchObject({ pace: 4050, finishDate: '2026-11-28' })
  })

  it('works with fewer than 3 months', () => {
    const two = [
      { month: '2026-08', value: 1500 },
      { month: '2026-09', value: 2500 },
    ]
    expect(totalForecast({ ...base, months: two }).pace).toBe(2000)
  })

  it('no pace: no finish date, off track', () => {
    const f = totalForecast({ ...base, months: [] })
    expect(f).toMatchObject({ pace: 0, finishDate: null, daysEarly: null })
    expect(goalStatus(f)).toBe('off_track')
  })

  it('a deadline in the past has no needed pace and runs late', () => {
    const f = totalForecast({ ...base, deadline: '2026-10-01' })
    expect(f.neededPace).toBeNull()
    expect(f.daysEarly).toBe(-89)
    expect(goalStatus(f)).toBe('behind')
  })
})

describe('goalStatus', () => {
  const status = (daysEarly: number) => goalStatus({ reached: false, daysEarly, pace: 2025 })

  it('uses days early against the deadline', () => {
    expect(status(14)).toBe('ahead')
    expect(status(13)).toBe('on_track')
    expect(status(0)).toBe('on_track')
    expect(status(-1)).toBe('slightly_behind')
    expect(status(-21)).toBe('slightly_behind')
    expect(status(-22)).toBe('behind')
  })

  it('no pace is off track; reached wins over everything', () => {
    expect(goalStatus({ reached: false, daysEarly: 30, pace: 0 })).toBe('off_track')
    expect(goalStatus({ reached: true, daysEarly: -50, pace: 0 })).toBe('reached')
  })
})

describe('levelForecast', () => {
  // "Earn €3,000 in a single month": +€200 a month from €2,400 in October.
  const level: MonthValue[] = [
    { month: '2026-07', value: 1800 },
    { month: '2026-08', value: 2000 },
    { month: '2026-09', value: 2300 },
    { month: '2026-10', value: 2400 },
  ]

  it('reaches the level in the right month', () => {
    expect(levelForecast({ months: level, target: 3000, today: TODAY })).toEqual({
      growth: 200,
      reachMonth: '2027-01',
      reached: false,
    })
    expect(levelForecast({ months: level, target: 2600, today: TODAY }).reachMonth).toBe('2026-11')
  })

  it('is reached when the last month is already there', () => {
    expect(levelForecast({ months: level, target: 2400, today: TODAY })).toMatchObject({ reached: true, reachMonth: '2026-10' })
  })

  it('never reaches without growth or beyond 5 years', () => {
    const flat = level.map((m) => ({ ...m, value: 2000 }))
    expect(levelForecast({ months: flat, target: 3000, today: TODAY }).reachMonth).toBeNull()
    expect(levelForecast({ months: level, target: 100000, today: TODAY }).reachMonth).toBeNull()
    expect(levelForecast({ months: [], target: 3000, today: TODAY })).toEqual({ growth: 0, reachMonth: null, reached: false })
  })

  it('with fewer than 4 months uses the real gap', () => {
    const two = [
      { month: '2026-08', value: 1000 },
      { month: '2026-10', value: 1600 },
    ]
    expect(levelForecast({ months: two, target: 3000, today: TODAY }).growth).toBe(300)
  })
})

describe('pipelineExpected', () => {
  it('weights open deals by stage', () => {
    const result = pipelineExpected([
      { name: 'Nova Dental', value: 2000, stage: 'proposal' },
      { name: 'Fitbox', value: 1000, stage: 'meeting' },
      { name: 'Café', value: 400, stage: 'replied' },
      { name: 'Smile', value: 1000, stage: 'contacted' },
      { name: 'New one', value: 500, stage: 'new' },
    ])
    expect(result.items.map((i) => [i.name, i.probability, i.expected])).toEqual([
      ['Nova Dental', 0.5, 1000],
      ['Fitbox', 0.3, 300],
      ['Café', 0.15, 60],
      ['Smile', 0.05, 50],
      ['New one', 0, 0],
    ])
    expect(result.total).toBe(1410)
    expect(pipelineExpected([]).total).toBe(0)
  })
})
