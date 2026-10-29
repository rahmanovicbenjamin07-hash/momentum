import { describe, expect, it } from 'vitest'
import { formatAxisValue, formatChange, formatMetricValue, monthName, monthShort, niceScale, valueLabel, yearMonths } from './format'

describe('metric format helpers', () => {
  it('formats values by unit', () => {
    expect(formatMetricValue(13950, 'eur')).toBe('€13,950')
    expect(formatMetricValue(1371, 'hours')).toBe('1,371 h')
    expect(formatMetricValue(117, 'count')).toBe('117')
    expect(formatMetricValue(12.5, 'km')).toBe('12.5 km')
    expect(formatMetricValue(1, 'days')).toBe('1 day')
  })

  it('formats axis labels short', () => {
    expect(formatAxisValue(15000, 'eur')).toBe('€15k')
    expect(formatAxisValue(0, 'eur')).toBe('€0')
    expect(formatAxisValue(1500, 'hours')).toBe('1.5k h')
    expect(formatAxisValue(120, 'count')).toBe('120')
  })

  it('formats changes like the design', () => {
    expect(formatChange(0.128)).toBe('+13%')
    expect(formatChange(0.082)).toBe('+8.2%')
    expect(formatChange(-0.053)).toBe('−5.3%')
    expect(formatChange(-0.109)).toBe('−11%')
    expect(formatChange(0)).toBe('0%')
  })

  it('names months', () => {
    expect(monthName('2026-10')).toBe('October')
    expect(monthName('2026-10', true)).toBe('October 2026')
    expect(monthShort('2026-01')).toBe('Jan')
    expect(yearMonths(2026)).toHaveLength(12)
    expect(valueLabel('eur')).toBe('Amount (€) for the month')
  })

  it('picks round axis tops', () => {
    expect(niceScale(18000)).toEqual({ max: 20000, step: 5000 })
    expect(niceScale(1700)).toEqual({ max: 2000, step: 500 })
    expect(niceScale(150)).toEqual({ max: 150, step: 50 })
    expect(niceScale(7)).toEqual({ max: 8, step: 2 })
    expect(niceScale(0)).toEqual({ max: 4, step: 1 })
  })
})
