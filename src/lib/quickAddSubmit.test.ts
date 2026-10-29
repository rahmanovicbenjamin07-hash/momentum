import { describe, expect, it } from 'vitest'
import type { QuickAddFormValues } from '@/schemas/today'
import { buildQuickAdd, defaultQuickAddDay, quickAddDueDate } from './quickAddSubmit'

const TODAY = '2026-10-28'
const form = (values: Partial<QuickAddFormValues> & { text: string }): QuickAddFormValues => ({
  time: undefined,
  repeat: 'just_today',
  day: 'today',
  date: undefined,
  ...values,
})

describe('buildQuickAdd', () => {
  it('makes a one-off task for today, reading the shortcuts', () => {
    expect(buildQuickAdd(form({ text: 'Call Amir about the website #outreach !high 10:30' }), TODAY)).toEqual({
      ok: true,
      value: { kind: 'task', title: 'Call Amir about the website', time: '10:30', tag: 'outreach', priority: 'high', dueDate: TODAY },
    })
  })

  it('lets the time field win over a time in the text', () => {
    const outcome = buildQuickAdd(form({ text: 'Gym 07:00', time: '18:00' }), TODAY)
    expect(outcome.ok && outcome.value.time).toBe('18:00')
  })

  it('leaves time, tag and priority empty when not given', () => {
    expect(buildQuickAdd(form({ text: 'Review Q4 goals' }), TODAY)).toEqual({
      ok: true,
      value: { kind: 'task', title: 'Review Q4 goals', time: null, tag: null, priority: null, dueDate: TODAY },
    })
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
      value: { kind: 'routine', title: 'Read 20 pages', time: '21:30', days },
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
  it('starts on the day on screen', () => {
    expect(defaultQuickAddDay(TODAY, TODAY)).toEqual({ day: 'today', date: '' })
    expect(defaultQuickAddDay('2026-10-29', TODAY)).toEqual({ day: 'tomorrow', date: '' })
    expect(defaultQuickAddDay('2026-11-03', TODAY)).toEqual({ day: 'date', date: '2026-11-03' })
  })
})
