import { describe, expect, it } from 'vitest'
import type { TodayItem } from '@/schemas/today'
import {
  countTodayItems,
  filterTodayItems,
  formatRepeatDays,
  percentDone,
  sortTodayItems,
  tagLabel,
  tagTone,
  toHHMM,
} from './today-list'

const d = (s: string) => s.split('').map((c) => c === '1')

describe('formatRepeatDays', () => {
  it.each([
    ['1111111', 'Every day'],
    ['1111100', 'Mon–Fri'],
    ['0000011', 'Weekends'],
    ['1010100', 'Mon, Wed, Fri'],
    ['1111000', 'Mon–Thu'],
    ['0011100', 'Wed–Fri'],
    ['1100000', 'Mon, Tue'],
    ['0000010', 'Sat'],
    ['1000001', 'Mon, Sun'],
    ['0000000', 'No days'],
  ])('%s → %s', (days, label) => {
    expect(formatRepeatDays(d(days))).toBe(label)
  })
})

describe('toHHMM', () => {
  it('drops seconds and keeps null', () => {
    expect(toHHMM('06:30:00')).toBe('06:30')
    expect(toHHMM('21:30')).toBe('21:30')
    expect(toHHMM(null)).toBeNull()
  })
})

let n = 0
function item(partial: Partial<TodayItem>): TodayItem {
  n += 1
  return { kind: 'task', id: `id-${n}`, title: `Item ${n}`, time: null, done: false, ...partial }
}

describe('sortTodayItems', () => {
  it('puts unfinished first, then sorts by time with anytime last, keeping ties in order', () => {
    const items = [
      item({ title: 'done anytime', done: true }),
      item({ title: 'anytime A' }),
      item({ title: '14:00', time: '14:00' }),
      item({ title: 'done 06:00', done: true, time: '06:00' }),
      item({ title: 'anytime B' }),
      item({ title: '09:15', time: '09:15' }),
    ]
    expect(sortTodayItems(items).map((i) => i.title)).toEqual([
      '09:15',
      '14:00',
      'anytime A',
      'anytime B',
      'done 06:00',
      'done anytime',
    ])
  })

  it('does not change the input array', () => {
    const items = [item({ done: true }), item({})]
    const copy = [...items]
    sortTodayItems(items)
    expect(items).toEqual(copy)
  })
})

describe('counting and filtering', () => {
  const items = [
    item({ kind: 'routine', done: true }),
    item({ kind: 'routine' }),
    item({ kind: 'task', done: true }),
    item({ kind: 'task' }),
    item({ kind: 'task' }),
  ]

  it('counts all, per kind, and done', () => {
    expect(countTodayItems(items)).toEqual({ all: 5, routine: 2, task: 3, done: 2, routineDone: 1, taskDone: 1 })
    expect(countTodayItems([])).toEqual({ all: 0, routine: 0, task: 0, done: 0, routineDone: 0, taskDone: 0 })
  })

  it('filters by kind', () => {
    expect(filterTodayItems(items, 'all')).toHaveLength(5)
    expect(filterTodayItems(items, 'routine')).toHaveLength(2)
    expect(filterTodayItems(items, 'task')).toHaveLength(3)
  })
})

describe('percentDone', () => {
  it('rounds and handles zero', () => {
    expect(percentDone(5, 11)).toBe(45)
    expect(percentDone(0, 0)).toBe(0)
    expect(percentDone(3, 3)).toBe(100)
  })
})

describe('tags', () => {
  it('capitalises the label', () => {
    expect(tagLabel('outreach')).toBe('Outreach')
  })

  it('gives known tags their design colour and others a stable one', () => {
    expect(tagTone('Outreach')).toBe('brand')
    expect(tagTone('work')).toBe('info')
    expect(tagTone('marketing')).toBe('pink')
    expect(tagTone('gardening')).toBe(tagTone('gardening'))
  })
})
