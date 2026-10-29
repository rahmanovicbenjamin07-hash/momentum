import { describe, expect, it } from 'vitest'
import {
  bestMonth,
  changeVsPrevious,
  compoundGrowthPerMonth,
  groupByMonth,
  growthShape,
  monthsInYear,
  percentOfGoal,
  runningTotal,
  vsSameTimeLastYear,
  yearEndForecast,
  type MonthValue,
} from './metrics'

/** Builds monthly entries: [["2026-01", 850], …] → entries on the 1st. */
function monthly(values: [string, number, string?][]) {
  return values.map(([month, value, note]) => ({ entry_date: `${month}-01`, value, note: note ?? null }))
}

// "Money earned" from design/progress.png.
const money2026 = groupByMonth(
  monthly([
    ['2026-01', 850],
    ['2026-02', 920],
    ['2026-03', 1100],
    ['2026-04', 980],
    ['2026-05', 1350, 'Raised hourly rate'],
    ['2026-06', 1500],
    ['2026-07', 1420],
    ['2026-08', 1680, 'Fitbox Gym project'],
    ['2026-09', 1950],
    ['2026-10', 2200, '2 new clients'],
  ]),
)

// 2025: €8,150 by end of October (as in the design), plus Nov and Dec.
const money2025 = groupByMonth(
  monthly([
    ['2025-01', 500],
    ['2025-02', 550],
    ['2025-03', 600],
    ['2025-04', 650],
    ['2025-05', 750],
    ['2025-06', 800],
    ['2025-07', 950],
    ['2025-08', 1100],
    ['2025-09', 1200],
    ['2025-10', 1050],
    ['2025-11', 1300],
    ['2025-12', 1400],
  ]),
)

const values = (...vs: number[]): Pick<MonthValue, 'value'>[] => vs.map((value) => ({ value }))

describe('groupByMonth', () => {
  it('adds up weekly entries per month, across month boundaries, oldest first', () => {
    const trainings = [
      { entry_date: '2026-10-26', value: 3, note: null },
      { entry_date: '2026-09-28', value: 4, note: 'Back from holiday' },
      { entry_date: '2026-10-05', value: 2, note: '  ' },
      { entry_date: '2026-10-12', value: 4, note: 'New gym' },
      { entry_date: '2026-10-19', value: 3, note: 'Knee ok' },
      { entry_date: '2026-11-02', value: 1, note: null },
    ]
    expect(groupByMonth(trainings)).toEqual([
      { month: '2026-09', value: 4, note: 'Back from holiday', entries: 1 },
      { month: '2026-10', value: 12, note: 'New gym · Knee ok', entries: 4 },
      { month: '2026-11', value: 1, note: null, entries: 1 },
    ])
  })

  it('sums decimals without floating-point noise', () => {
    const hours = [0.1, 0.2, 7.5].map((value, i) => ({ entry_date: `2026-10-0${i + 1}`, value, note: null }))
    expect(groupByMonth(hours)[0]?.value).toBe(7.8)
  })

  it('returns nothing for no entries', () => {
    expect(groupByMonth([])).toEqual([])
  })
})

describe('runningTotal and changeVsPrevious', () => {
  it('matches the entries table in the design', () => {
    const totals = runningTotal(money2026).map((m) => m.total)
    expect(totals).toEqual([850, 1770, 2870, 3850, 5200, 6700, 8120, 9800, 11750, 13950])

    const changes = changeVsPrevious(money2026).map((c) => (c === null ? null : Math.round(c * 1000) / 10))
    // — , +8.2%, +20%, −11%, +38%, +11%, −5.3%, +18%, +16%, +13%
    expect(changes).toEqual([null, 8.2, 19.6, -10.9, 37.8, 11.1, -5.3, 18.3, 16.1, 12.8])
  })

  it('has no change after a zero month', () => {
    expect(changeVsPrevious(values(0, 100))).toEqual([null, null])
  })
})

describe('compoundGrowthPerMonth', () => {
  it('is +11% per month from Jan (€850) to Oct (€2,200)', () => {
    expect(compoundGrowthPerMonth(money2026)).toBeCloseTo(0.1114, 4)
  })

  it('counts gaps as months', () => {
    // 100 → 400 over 2 months (March missing) = doubling each month.
    const months = [
      { month: '2026-01', value: 100 },
      { month: '2026-03', value: 400 },
    ]
    expect(compoundGrowthPerMonth(months)).toBeCloseTo(1, 10)
  })

  it('is null with one month or a zero start', () => {
    expect(compoundGrowthPerMonth([{ month: '2026-01', value: 100 }])).toBeNull()
    expect(
      compoundGrowthPerMonth([
        { month: '2026-01', value: 0 },
        { month: '2026-02', value: 100 },
      ]),
    ).toBeNull()
  })

  it('goes negative when the metric shrinks', () => {
    const months = [
      { month: '2026-01', value: 1000 },
      { month: '2026-02', value: 810 },
      { month: '2026-03', value: 656.1 },
    ]
    expect(compoundGrowthPerMonth(months)).toBeCloseTo(-0.19, 10)
  })
})

describe('growthShape', () => {
  it('is Accelerating for the design data (avg change +125 then +170)', () => {
    expect(growthShape(money2026)).toBe('accelerating')
  })

  it('is Steady growth when the change stays the same', () => {
    expect(growthShape(values(100, 200, 300, 400, 500))).toBe('steady')
  })

  it('is Steady growth while still growing, even if more slowly', () => {
    // changes +100, +100 | +20, +10, +5
    expect(growthShape(values(100, 200, 300, 320, 330, 335))).toBe('steady')
  })

  it('is Holding steady when recent changes are under 1% of the average month', () => {
    // mean ≈ 1000, recent average change ≈ −0.3 (< 10)
    expect(growthShape(values(1000, 1002, 998, 1001, 999, 1000))).toBe('holding')
    expect(growthShape(values(0, 0, 0))).toBe('holding')
  })

  it('is Slowing down when the recent change is negative', () => {
    expect(growthShape(values(2000, 1900, 1800, 1600))).toBe('slowing')
  })

  it('counts a recovery after a drop as Accelerating', () => {
    // changes −100 | +50, +60
    expect(growthShape(values(1000, 900, 950, 1010))).toBe('accelerating')
  })

  it('needs at least 3 months', () => {
    expect(growthShape(values(100, 200))).toBeNull()
  })
})

describe('bestMonth', () => {
  it('is October, €2,200', () => {
    expect(bestMonth(money2026)).toMatchObject({ month: '2026-10', value: 2200, note: '2 new clients' })
  })

  it('takes the earliest on a tie and ignores all-zero data', () => {
    const tie = [
      { month: '2026-01', value: 5 },
      { month: '2026-02', value: 5 },
    ]
    expect(bestMonth(tie)?.month).toBe('2026-01')
    expect(bestMonth(values(0, 0))).toBeNull()
    expect(bestMonth([])).toBeNull()
  })
})

describe('yearEndForecast', () => {
  it('is ≈ €17,837 (99% of €18,000) at the Aug–Oct pace', () => {
    const forecast = yearEndForecast(money2026)
    // pace = (1680 + 1950 + 2200) ÷ 3 = 1943.33; 13,950 + 2 × 1943.33
    expect(forecast?.soFar).toBe(13950)
    expect(forecast?.pace).toBeCloseTo(1943.333, 3)
    expect(forecast?.remainingMonths).toBe(2)
    expect(Math.round(forecast?.total ?? 0)).toBe(17837)
    expect(percentOfGoal(forecast?.total ?? 0, 18000)).toBeCloseTo(0.991, 3)
    expect(forecast?.points.map((p) => p.month)).toEqual(['2026-10', '2026-11', '2026-12'])
    expect(forecast?.points.map((p) => Math.round(p.total))).toEqual([13950, 15893, 17837])
  })

  it('uses fewer months when fewer are logged', () => {
    const forecast = yearEndForecast([
      { month: '2026-01', value: 100 },
      { month: '2026-02', value: 300 },
    ])
    // pace 200 × 10 months left
    expect(forecast?.total).toBe(2400)
  })

  it('a December entry means nothing is left to forecast', () => {
    const forecast = yearEndForecast(money2025)
    expect(forecast?.remainingMonths).toBe(0)
    expect(forecast?.total).toBe(10850)
    expect(forecast?.points).toEqual([{ month: '2025-12', total: 10850 }])
  })

  it('is null with nothing logged', () => {
    expect(yearEndForecast([])).toBeNull()
  })
})

describe('percentOfGoal', () => {
  it('matches the cards (78% of €18,000)', () => {
    expect(percentOfGoal(13950, 18000)).toBeCloseTo(0.775, 3)
    expect(percentOfGoal(100, null)).toBeNull()
    expect(percentOfGoal(100, 0)).toBeNull()
  })
})

describe('vsSameTimeLastYear', () => {
  it('is +71% vs €8,150 in Jan–Oct 2025 (Nov and Dec left out)', () => {
    const result = vsSameTimeLastYear(money2026, money2025)
    expect(result).toMatchObject({ thisYear: 13950, lastYear: 8150, throughMonth: 10 })
    expect(result.change).toBeCloseTo(0.7117, 4)
  })

  it('can compare up to a given month', () => {
    expect(vsSameTimeLastYear(money2026, money2025, 3)).toMatchObject({ thisYear: 2870, lastYear: 1650 })
  })

  it('has no % when last year had nothing', () => {
    expect(vsSameTimeLastYear(money2026, []).change).toBeNull()
  })

  it('works on mixed-year data split with monthsInYear', () => {
    const all = [...money2025, ...money2026]
    const result = vsSameTimeLastYear(monthsInYear(all, 2026), monthsInYear(all, 2025))
    expect(result.lastYear).toBe(8150)
  })
})
