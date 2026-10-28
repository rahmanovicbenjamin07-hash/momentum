import { describe, expect, it } from 'vitest'
import { buildQuickAdd } from './quickAddSubmit'

describe('buildQuickAdd', () => {
  it('makes a one-off task from "Just today", reading the shortcuts', () => {
    expect(buildQuickAdd({ text: 'Call Amir about the website #outreach !high 10:30', time: undefined, repeat: 'just_today' })).toEqual({
      ok: true,
      value: { kind: 'task', title: 'Call Amir about the website', time: '10:30', tag: 'outreach', priority: 'high' },
    })
  })

  it('lets the time field win over a time in the text', () => {
    const outcome = buildQuickAdd({ text: 'Gym 07:00', time: '18:00', repeat: 'just_today' })
    expect(outcome.ok && outcome.value.time).toBe('18:00')
  })

  it('leaves time, tag and priority empty when not given', () => {
    expect(buildQuickAdd({ text: 'Review Q4 goals', time: undefined, repeat: 'just_today' })).toEqual({
      ok: true,
      value: { kind: 'task', title: 'Review Q4 goals', time: null, tag: null, priority: null },
    })
  })

  it.each([
    ['weekdays', [true, true, true, true, true, false, false]],
    ['every_day', [true, true, true, true, true, true, true]],
    ['weekends', [false, false, false, false, false, true, true]],
  ] as const)('makes a routine item for %s', (repeat, days) => {
    expect(buildQuickAdd({ text: 'Read 20 pages 21:30 #personal', time: undefined, repeat })).toEqual({
      ok: true,
      value: { kind: 'routine', title: 'Read 20 pages', time: '21:30', days },
    })
  })

  it('refuses text that is only shortcuts', () => {
    expect(buildQuickAdd({ text: '#work !high', time: undefined, repeat: 'just_today' })).toEqual({
      ok: false,
      message: 'Add a few words besides the #tag, !priority or time',
    })
  })
})
