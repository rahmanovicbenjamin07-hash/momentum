import { describe, expect, it } from 'vitest'
import { parseQuickAdd, repeatToDays } from './quickAdd'

describe('parseQuickAdd', () => {
  it('reads tag, priority and time and cleans the title', () => {
    expect(parseQuickAdd('Call Amir about the website #outreach !high 10:00')).toEqual({
      title: 'Call Amir about the website',
      tag: 'outreach',
      priority: 'high',
      time: '10:00',
    })
  })

  it('works with tokens anywhere in the text', () => {
    expect(parseQuickAdd('!low 9:05 Review #Work goals')).toEqual({
      title: 'Review goals',
      tag: 'work',
      priority: 'low',
      time: '09:05',
    })
  })

  it('returns nulls for plain text', () => {
    expect(parseQuickAdd('  Prepare   demo  ')).toEqual({ title: 'Prepare demo', tag: null, priority: null, time: null })
  })

  it('accepts priority in any case', () => {
    expect(parseQuickAdd('Plan week !MEDIUM').priority).toBe('medium')
  })

  it('ignores invalid tokens and leaves them in the title', () => {
    expect(parseQuickAdd('Meet at 25:00 !urgent')).toEqual({
      title: 'Meet at 25:00 !urgent',
      tag: null,
      priority: null,
      time: null,
    })
    expect(parseQuickAdd('Ratio 10:000').time).toBeNull()
  })

  it('needs tokens to stand alone', () => {
    expect(parseQuickAdd('email me@x.com#tag').tag).toBeNull()
    expect(parseQuickAdd('Hello!high').priority).toBeNull()
  })

  it('uses the first of each kind and keeps the rest in the title', () => {
    expect(parseQuickAdd('Ship #work #personal !high !low 10:00 11:00')).toEqual({
      title: 'Ship #personal !low 11:00',
      tag: 'work',
      priority: 'high',
      time: '10:00',
    })
  })

  it('limits tags to 32 characters', () => {
    expect(parseQuickAdd(`Task #${'a'.repeat(33)}`).tag).toBeNull()
    expect(parseQuickAdd(`Task #${'a'.repeat(32)}`).tag).toBe('a'.repeat(32))
  })

  it('can leave an empty title (caller validates)', () => {
    expect(parseQuickAdd('#work !high').title).toBe('')
  })

  it('handles midnight and 23:59', () => {
    expect(parseQuickAdd('A 0:00').time).toBe('00:00')
    expect(parseQuickAdd('B 23:59').time).toBe('23:59')
  })
})

describe('repeatToDays', () => {
  it('maps each Repeat option to Mon..Sun', () => {
    expect(repeatToDays('every_day')).toEqual([true, true, true, true, true, true, true])
    expect(repeatToDays('weekdays')).toEqual([true, true, true, true, true, false, false])
    expect(repeatToDays('weekends')).toEqual([false, false, false, false, false, true, true])
    expect(repeatToDays('just_today')).toEqual([false, false, false, false, false, false, false])
  })

  it('returns a new array each time', () => {
    const a = repeatToDays('weekdays')
    a[0] = false
    expect(repeatToDays('weekdays')[0]).toBe(true)
  })
})
