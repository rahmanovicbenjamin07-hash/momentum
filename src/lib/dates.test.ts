import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayIndex,
  daysBetween,
  formatDate,
  formatLongDate,
  getToday,
  isDateKey,
  toDateKey,
  weekDays,
  weekStart,
} from './dates'

describe('isDateKey', () => {
  it('accepts real days', () => {
    expect(isDateKey('2026-10-28')).toBe(true)
    expect(isDateKey('2028-02-29')).toBe(true) // leap year
  })

  it('rejects bad formats and impossible days', () => {
    for (const v of ['2026-02-30', '2027-02-29', '2026-13-01', '2026-1-5', '28 Oct 2026', '', 20261028, null]) {
      expect(isDateKey(v)).toBe(false)
    }
  })
})

describe('toDateKey', () => {
  it('uses the time zone, not UTC', () => {
    // 23:30 UTC on the 27th is 00:30 on the 28th in Sarajevo (UTC+1 in winter).
    expect(toDateKey(new Date('2026-10-27T23:30:00Z'))).toBe('2026-10-28')
    expect(toDateKey(new Date('2026-10-27T23:30:00Z'), 'UTC')).toBe('2026-10-27')
  })

  it('handles summer time (UTC+2)', () => {
    expect(toDateKey(new Date('2026-07-14T22:30:00Z'))).toBe('2026-07-15')
  })
})

describe('getToday', () => {
  it('defaults to Sarajevo with the day ending at midnight', () => {
    expect(getToday({ now: new Date('2026-10-28T10:00:00Z') })).toBe('2026-10-28')
    expect(getToday({ now: new Date('2026-10-27T23:30:00Z') })).toBe('2026-10-28')
  })

  it('keeps counting as yesterday before day_end_hour', () => {
    // 01:30 Sarajevo time on the 28th
    const now = new Date('2026-10-28T00:30:00Z')
    expect(getToday({ now, dayEndHour: 3 })).toBe('2026-10-27')
    expect(getToday({ now, dayEndHour: 1 })).toBe('2026-10-28')
  })

  it('switches to the new day exactly at day_end_hour', () => {
    // 03:00 Sarajevo time on the 28th
    expect(getToday({ now: new Date('2026-10-28T02:00:00Z'), dayEndHour: 3 })).toBe('2026-10-28')
    // 02:59
    expect(getToday({ now: new Date('2026-10-28T01:59:00Z'), dayEndHour: 3 })).toBe('2026-10-27')
  })

  it('respects another time zone', () => {
    expect(getToday({ now: new Date('2026-10-28T02:00:00Z'), timeZone: 'America/New_York' })).toBe('2026-10-27')
  })

  it('crosses month and year boundaries', () => {
    expect(getToday({ now: new Date('2027-01-01T00:30:00Z'), dayEndHour: 4 })).toBe('2026-12-31')
  })

  it('rejects an invalid day_end_hour', () => {
    expect(() => getToday({ dayEndHour: 24 })).toThrow(RangeError)
    expect(() => getToday({ dayEndHour: -1 })).toThrow(RangeError)
    expect(() => getToday({ dayEndHour: 1.5 })).toThrow(RangeError)
  })
})

describe('addDays / daysBetween', () => {
  it('moves across months, years and leap days', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29')
    expect(addDays('2026-10-28', 0)).toBe('2026-10-28')
  })

  it('is not affected by daylight-saving changes', () => {
    // Clocks go back on 25 Oct 2026 and forward on 29 Mar 2026 in Europe.
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
  })

  it('counts days between, negative when going back', () => {
    expect(daysBetween('2026-10-26', '2026-11-01')).toBe(6)
    expect(daysBetween('2026-11-01', '2026-10-26')).toBe(-6)
  })

  it('throws on an invalid key', () => {
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError)
  })
})

describe('dayIndex', () => {
  it('starts the week on Monday', () => {
    expect(dayIndex('2026-10-26')).toBe(0) // Monday
    expect(dayIndex('2026-10-28')).toBe(2) // Wednesday
    expect(dayIndex('2026-11-01')).toBe(6) // Sunday
  })
})

describe('weekStart / weekDays', () => {
  it('returns the Monday of the week', () => {
    expect(weekStart('2026-10-28')).toBe('2026-10-26')
    expect(weekStart('2026-10-26')).toBe('2026-10-26')
    expect(weekStart('2026-11-01')).toBe('2026-10-26') // Sunday belongs to the week before
  })

  it('lists Mon → Sun, across a month boundary', () => {
    expect(weekDays('2026-10-28')).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ])
  })
})

describe('formatDate', () => {
  it('formats an instant as "28 Oct 2026" in Sarajevo time', () => {
    expect(formatDate(new Date('2026-10-28T10:00:00Z'))).toBe('28 Oct 2026')
    expect(formatDate(new Date('2026-10-27T23:30:00Z'))).toBe('28 Oct 2026')
  })

  it('formats a DateKey without shifting it', () => {
    expect(formatDate('2026-03-05')).toBe('5 Mar 2026')
  })
})

describe('formatLongDate', () => {
  it('formats with weekday and full month', () => {
    expect(formatLongDate(new Date('2026-10-28T10:00:00Z'))).toBe('Wednesday, 28 October 2026')
    expect(formatLongDate('2026-10-28')).toBe('Wednesday, 28 October 2026')
  })

  it('respects another time zone when given', () => {
    expect(formatLongDate(new Date('2026-10-28T02:00:00Z'), 'America/New_York')).toBe('Tuesday, 27 October 2026')
  })
})

describe('weeks starting on Sunday', () => {
  it('weekStart and weekDays follow weekStartsOn', () => {
    // Wednesday 28 Oct 2026
    expect(weekStart('2026-10-28')).toBe('2026-10-26') // Monday (default)
    expect(weekStart('2026-10-28', 0)).toBe('2026-10-25') // Sunday
    expect(weekStart('2026-10-25', 0)).toBe('2026-10-25') // a Sunday starts its own week
    expect(weekStart('2026-10-25', 1)).toBe('2026-10-19') // …but ends the Monday week
    expect(weekDays('2026-10-28', 0)).toEqual(['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'])
  })
})
