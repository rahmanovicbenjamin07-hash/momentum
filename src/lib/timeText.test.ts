import { describe, expect, it } from 'vitest'
import { parseTimeText } from './timeText'

const value = (text: string) => {
  const result = parseTimeText(text)
  return result.ok ? result.value : 'invalid'
}

describe('parseTimeText', () => {
  it('keeps a proper HH:MM', () => {
    expect(value('09:30')).toBe('09:30')
    expect(value('21:15')).toBe('21:15')
    expect(value('00:00')).toBe('00:00')
    expect(value('23:59')).toBe('23:59')
  })

  it('reads the quick ways of typing it (24-hour, no AM/PM)', () => {
    expect(value('9')).toBe('09:00')
    expect(value('21')).toBe('21:00')
    expect(value('930')).toBe('09:30')
    expect(value('0930')).toBe('09:30')
    expect(value('2130')).toBe('21:30')
    expect(value('9:5')).toBe('09:05')
    expect(value('21:')).toBe('21:00')
    expect(value('9.30')).toBe('09:30')
    expect(value('9,30')).toBe('09:30')
    expect(value('9h30')).toBe('09:30')
    expect(value(' 14 : 05 ')).toBe('14:05')
  })

  it('empty means no time', () => {
    expect(value('')).toBe('')
    expect(value('   ')).toBe('')
  })

  it('rejects anything that is not a time', () => {
    for (const text of ['24:00', '25', '9:60', '2400', '12345', 'abc', '9pm', ':30', '1:2:3']) {
      expect({ text, result: value(text) }).toEqual({ text, result: 'invalid' })
    }
  })
})
