import { describe, expect, it } from 'vitest'
import { buildGoalChart, forecastSentence, neededSentence, type GoalChartInput } from './goalChart'

const total = {
  type: 'total' as const,
  unit: 'eur' as const,
  target: 18000,
  pace: 1943.33,
  finishDate: '2027-01-03',
  deadline: '2026-12-31',
  reached: false,
}

describe('forecastSentence: total goals', () => {
  it('late', () => {
    expect(forecastSentence(total)).toBe(
      "At your current pace (€1,943 a month) you'll reach €18,000 on 3 Jan 2027 — 3 days after your deadline.",
    )
  })

  it('early, one day late, and on the day', () => {
    expect(forecastSentence({ ...total, finishDate: '2026-12-02' })).toBe(
      "At your current pace (€1,943 a month) you'll reach €18,000 on 2 Dec 2026 — 29 days before your deadline.",
    )
    expect(forecastSentence({ ...total, finishDate: '2027-01-01' })).toContain('— 1 day after your deadline.')
    expect(forecastSentence({ ...total, finishDate: '2026-12-31' })).toBe(
      "At your current pace (€1,943 a month) you'll reach €18,000 on 31 Dec 2026 — right on your deadline.",
    )
  })

  it('with open deals', () => {
    expect(forecastSentence({ ...total, pipeline: 1910 })).toBe(
      "At your current pace (€1,943 a month) you'll reach €18,000 on 3 Jan 2027 — 3 days after your deadline, counting €1,910 expected from open deals.",
    )
    expect(forecastSentence({ ...total, pipeline: 0 })).not.toContain('open deals')
  })

  it('slider pace', () => {
    expect(forecastSentence({ ...total, pace: 2100, custom: true, finishDate: '2026-12-26' })).toBe(
      "At €2,100 a month you'll reach €18,000 on 26 Dec 2026 — 5 days before your deadline.",
    )
  })

  it('no pace yet, and reached', () => {
    expect(forecastSentence({ ...total, pace: 0, finishDate: null })).toBe(
      "At your current pace you won't reach €18,000 yet — log a few months first.",
    )
    expect(forecastSentence({ ...total, reached: true })).toBe("You've reached €18,000.")
  })

  it('other units use plain numbers', () => {
    expect(forecastSentence({ ...total, unit: 'hours', target: 1700, pace: 140, finishDate: '2026-12-31' })).toBe(
      "At your current pace (140 h a month) you'll reach 1,700 h on 31 Dec 2026 — right on your deadline.",
    )
    expect(forecastSentence({ ...total, unit: 'count', target: 150, reached: true })).toBe("You've reached 150.")
  })
})

describe('forecastSentence: level goals', () => {
  const level = {
    type: 'level' as const,
    unit: 'eur' as const,
    target: 3000,
    growth: 180,
    reachMonth: '2027-03',
    deadline: '2027-06-30',
    reached: false,
  }

  it('months before the deadline', () => {
    expect(forecastSentence(level)).toBe(
      "At your current growth (+€180 a month) you'll reach €3,000 a month in Mar 2027 — 3 months before your deadline.",
    )
  })

  it('after, in the month, not yet, reached', () => {
    expect(forecastSentence({ ...level, reachMonth: '2027-07' })).toContain('— 1 month after your deadline.')
    expect(forecastSentence({ ...level, reachMonth: '2027-06' })).toContain('— in your deadline month.')
    expect(forecastSentence({ ...level, growth: 0, reachMonth: null })).toBe(
      "At your current growth you won't reach €3,000 a month yet — log a few months first.",
    )
    expect(forecastSentence({ ...level, reached: true })).toBe("You've reached €3,000 a month.")
  })
})

describe('neededSentence', () => {
  it('pace needed by the deadline', () => {
    expect(neededSentence({ unit: 'eur', neededPace: 1070.4, deadline: '2027-01-01' })).toBe(
      'To finish by 1 Jan 2027 you need €1,070 a month.',
    )
  })

  it('deadline passed, or nothing left', () => {
    expect(neededSentence({ unit: 'eur', neededPace: null, deadline: '2026-10-01' })).toBe('Your deadline (1 Oct 2026) has passed.')
    expect(neededSentence({ unit: 'eur', neededPace: 0, deadline: '2027-01-01' })).toBe('You already have enough to finish by 1 Jan 2027.')
  })
})

describe('buildGoalChart', () => {
  // Money earned 2026: Jan–Oct = €13,950 (October so far); real pace €2,025.
  const values = [850, 920, 1100, 980, 1350, 1500, 1420, 1680, 1950, 2200]
  const base: GoalChartInput = {
    months: values.map((value, i) => ({ month: `2026-${String(i + 1).padStart(2, '0')}`, value })),
    startDate: '2026-01-01',
    deadline: '2026-12-31',
    today: '2026-10-29',
    target: 18000,
    pace: 2025,
    realPace: 2025,
    pipeline: 0,
    finishDate: '2026-12-29',
  }

  it('actual running total at month ends up to today, forecast to the finish', () => {
    const chart = buildGoalChart(base)
    expect(chart.actual[0]).toEqual({ date: '2026-01-01', value: 0 })
    expect(chart.actual[1]).toEqual({ date: '2026-01-31', value: 850 })
    expect(chart.actual[2]).toEqual({ date: '2026-02-28', value: 1770 })
    expect(chart.actual.at(-1)).toEqual({ date: '2026-10-29', value: 13950 })
    expect(chart.actual).toHaveLength(11)
    expect(chart.forecast).toEqual([
      { date: '2026-10-29', value: 13950 },
      { date: '2026-12-29', value: 18000 },
    ])
    expect(chart.finish).toEqual({ date: '2026-12-29', value: 18000 })
    expect(chart).toMatchObject({ ghost: null, pipelineJump: null, targetY: 18000, deadlineX: '2026-12-31', todayX: '2026-10-29', xMax: '2026-12-31' })
    expect(chart.yMax).toBeCloseTo(19800)
  })

  it('ghost only when the slider pace differs from the real pace', () => {
    expect(buildGoalChart({ ...base, pace: 2025 }).ghost).toBeNull()

    // Slider at €1,000: finishes in spring 2027; the ghost (real pace) still ends 29 Dec.
    const slow = buildGoalChart({ ...base, pace: 1000, finishDate: '2027-03-31' })
    expect(slow.finish).toEqual({ date: '2027-03-31', value: 18000 })
    expect(slow.xMax).toBe('2027-03-31')
    expect(slow.ghost).toEqual([
      { date: '2026-10-29', value: 13950 },
      { date: '2026-12-29', value: 18000 },
    ])
  })

  it('pipeline jumps up at today and the forecast starts from there', () => {
    const chart = buildGoalChart({ ...base, pipeline: 1300, finishDate: '2026-12-09' })
    expect(chart.pipelineJump).toEqual({ from: 13950, to: 15250 })
    expect(chart.forecast[0]).toEqual({ date: '2026-10-29', value: 15250 })
  })

  it('no finish date: no forecast; a high point lifts yMax', () => {
    const chart = buildGoalChart({ ...base, pace: 0, realPace: 0, finishDate: null, target: 10000 })
    expect(chart.forecast).toEqual([])
    expect(chart.finish).toBeNull()
    expect(chart.yMax).toBe(13950)
  })
})
