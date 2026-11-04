import { describe, expect, it } from 'vitest'
import type { QuickAddFormValues } from '@/schemas/today'
import { buildQuickAdd, defaultQuickAddDay, quickAddDueDate } from './quickAddSubmit'

const TODAY = '2026-10-28'
const form = (values: Partial<QuickAddFormValues> & { text: string }): QuickAddFormValues => ({
  time: undefined,
  endTime: undefined,
  repeat: 'just_today',
  day: 'today',
  date: undefined,
  ...values,
})

describe('buildQuickAdd', () => {
  it('makes a one-off task for today, reading the shortcuts', () => {
    expect(buildQuickAdd(form({ text: 'Call Amir about the website #outreach !high 10:30' }), TODAY)).toEqual({
      ok: true,
      value: { kind: 'task', title: 'Call Amir about the website', time: '10:30', endTime: null, tag: 'outreach', priority: 'high', dueDate: TODAY },
    })
  })

  it('keeps a time range, e.g. classes 08:00–11:00', () => {
    const outcome = buildQuickAdd(form({ text: 'Classes', time: '08:00', endTime: '11:00' }), TODAY)
    expect(outcome.ok && [outcome.value.time, outcome.value.endTime]).toEqual(['08:00', '11:00'])
    const repeating = buildQuickAdd(form({ text: 'Classes', time: '08:00', endTime: '11:00', repeat: 'every_day' }), TODAY)
    expect(repeating.ok && repeating.value.endTime).toBe('11:00')
  })

  it('refuses an end time before the start (also a start typed in the name)', () => {
    expect(buildQuickAdd(form({ text: 'Classes 11:00', endTime: '08:00' }), TODAY)).toEqual({
      ok: false,
      message: 'End time must be after the start time',
    })
    expect(buildQuickAdd(form({ text: 'Classes', endTime: '08:00' }), TODAY)).toEqual({
      ok: false,
      message: 'Set a start time first',
    })
  })

  it('lets the time field win over a time in the text', () => {
    const outcome = buildQuickAdd(form({ text: 'Gym 07:00', time: '18:00' }), TODAY)
    expect(outcome.ok && outcome.value.time).toBe('18:00')
  })

  it('leaves time, tag and priority empty when not given', () => {
    expect(buildQuickAdd(form({ text: 'Review Q4 goals' }), TODAY)).toEqual({
      ok: true,
      value: { kind: 'task', title: 'Review Q4 goals', time: null, endTime: null, tag: null, priority: null, dueDate: TODAY },
    })
  })

  it('every week repeats on the chosen day’s weekday', () => {
    // 28 Oct 2026 is a Wednesday, so tomorrow is a Thursday.
    expect(buildQuickAdd(form({ text: 'Weekly review', repeat: 'every_week' }), TODAY)).toEqual({
      ok: true,
      value: { kind: 'routine', title: 'Weekly review', time: null, endTime: null, days: [false, false, true, false, false, false, false] },
    })
    const thursday = buildQuickAdd(form({ text: 'Football', repeat: 'every_week', day: 'tomorrow', time: '19:00' }), TODAY)
    expect(thursday.ok && thursday.value.kind === 'routine' && thursday.value.days).toEqual([false, false, false, true, false, false, false])
  })

  it('plans a task for tomorrow or a picked date', () => {
    const tomorrow = buildQuickAdd(form({ text: 'Send invoice', day: 'tomorrow' }), TODAY)
    expect(tomorrow.ok && tomorrow.value.kind === 'task' && tomorrow.value.dueDate).toBe('2026-10-29')
    const picked = buildQuickAdd(form({ text: 'Dentist', day: 'date', date: '2026-11-05' }), TODAY)
    expect(picked.ok && picked.value.kind === 'task' && picked.value.dueDate).toBe('2026-11-05')
  })

  it.each([
    ['weekdays', [true, true, true, true, true, false, false]],
    ['every_day', [true, true, true, true, true, true, true]],
    ['weekends', [false, false, false, false, false, true, true]],
  ] as const)('makes a routine item for %s (the day is ignored)', (repeat, days) => {
    expect(buildQuickAdd(form({ text: 'Read 20 pages 21:30 #personal', repeat, day: 'tomorrow' }), TODAY)).toEqual({
      ok: true,
      value: { kind: 'routine', title: 'Read 20 pages', time: '21:30', endTime: null, days },
    })
  })

  it('refuses text that is only shortcuts', () => {
    expect(buildQuickAdd(form({ text: '#work !high' }), TODAY)).toEqual({
      ok: false,
      message: 'Add a few words besides the #tag, !priority or time',
    })
  })
})

describe('quickAddDueDate', () => {
  it('today, tomorrow (also across a month end), a picked date', () => {
    expect(quickAddDueDate('today', undefined, TODAY)).toBe(TODAY)
    expect(quickAddDueDate('tomorrow', undefined, '2026-10-31')).toBe('2026-11-01')
    expect(quickAddDueDate('date', '2026-12-24', TODAY)).toBe('2026-12-24')
    expect(quickAddDueDate('date', undefined, TODAY)).toBe(TODAY)
  })
})

describe('defaultQuickAddDay', () => {
  // Sarajevo is UTC+1 in late October (after the clocks go back).
  const at = (utc: string) => ({ now: new Date(utc), timeZone: 'Europe/Sarajevo' })

  it('starts on the day on screen', () => {
    expect(defaultQuickAddDay(TODAY, TODAY, at('2026-10-28T08:00:00Z'))).toEqual({ day: 'today', date: '' })
    expect(defaultQuickAddDay('2026-10-29', TODAY, at('2026-10-28T08:00:00Z'))).toEqual({ day: 'tomorrow', date: '' })
    expect(defaultQuickAddDay('2026-11-03', TODAY, at('2026-10-28T08:00:00Z'))).toEqual({ day: 'date', date: '2026-11-03' })
  })

  it('looking at today: Today before 1 PM, Tomorrow from 1 PM (Sarajevo time)', () => {
    expect(defaultQuickAddDay(TODAY, TODAY, at('2026-10-28T11:59:00Z')).day).toBe('today') // 12:59
    expect(defaultQuickAddDay(TODAY, TODAY, at('2026-10-28T12:00:00Z')).day).toBe('tomorrow') // 13:00
    expect(defaultQuickAddDay(TODAY, TODAY, at('2026-10-28T22:30:00Z')).day).toBe('tomorrow') // 23:30
    expect(defaultQuickAddDay(TODAY, TODAY, at('2026-10-27T23:30:00Z')).day).toBe('today') // 00:30
  })

  it('other days keep their own day at any hour', () => {
    expect(defaultQuickAddDay('2026-11-03', TODAY, at('2026-10-28T20:00:00Z'))).toEqual({ day: 'date', date: '2026-11-03' })
  })
})
