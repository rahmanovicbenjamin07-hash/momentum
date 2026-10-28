import { describe, expect, it } from 'vitest'
import { formatLongDate, formatShortDate } from './dates'

describe('formatLongDate', () => {
  it('formats a date with weekday and full month', () => {
    expect(formatLongDate(new Date('2026-10-28T10:00:00Z'))).toBe('Wednesday, 28 October 2026')
  })

  it('uses Sarajevo time, not UTC', () => {
    // 23:30 UTC on the 27th is already 00:30 on the 28th in Sarajevo (UTC+1 in winter).
    expect(formatLongDate(new Date('2026-10-27T23:30:00Z'))).toBe('Wednesday, 28 October 2026')
  })

  it('respects another time zone when given', () => {
    expect(formatLongDate(new Date('2026-10-28T02:00:00Z'), 'America/New_York')).toBe(
      'Tuesday, 27 October 2026',
    )
  })
})

describe('formatShortDate', () => {
  it('formats as "28 Oct 2026"', () => {
    expect(formatShortDate(new Date('2026-10-28T10:00:00Z'))).toBe('28 Oct 2026')
  })

  it('does not pad single-digit days', () => {
    expect(formatShortDate(new Date('2026-03-05T10:00:00Z'))).toBe('5 Mar 2026')
  })
})
