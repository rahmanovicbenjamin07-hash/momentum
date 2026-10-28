import { describe, expect, it } from 'vitest'
import type { TodayItem } from '@/schemas/today'
import { buildTodayItems, formatDays, isScheduledOn, sortTodayItems, type TodayRoutineInput, type TodayTaskInput } from './todayList'

const WEEKDAYS = [true, true, true, true, true, false, false]
const EVERY_DAY = [true, true, true, true, true, true, true]
const WED = '2026-10-28'
const SAT = '2026-10-31'

describe('isScheduledOn', () => {
  it('follows the weekday ticks (Mon = index 0)', () => {
    expect(isScheduledOn({ days: WEEKDAYS, active: true }, WED)).toBe(true)
    expect(isScheduledOn({ days: WEEKDAYS, active: true }, SAT)).toBe(false)
  })

  it('skips inactive items', () => {
    expect(isScheduledOn({ days: EVERY_DAY, active: false }, WED)).toBe(false)
  })

  it('is not due before it was created, in the user time zone', () => {
    // 23:30 UTC on the 27th = 00:30 on the 28th in Sarajevo
    const item = { days: EVERY_DAY, active: true, created_at: '2026-10-27T23:30:00+00:00' }
    expect(isScheduledOn(item, '2026-10-27')).toBe(false)
    expect(isScheduledOn(item, WED)).toBe(true)
    expect(isScheduledOn(item, '2026-10-27', 'UTC')).toBe(true)
  })
})

describe('formatDays', () => {
  it.each([
    [EVERY_DAY, 'Every day'],
    [WEEKDAYS, 'Mon–Fri'],
    [[false, false, false, false, false, true, true], 'Weekends'],
    [[true, false, true, false, true, false, false], 'Mon, Wed, Fri'],
  ])('%j → %s', (days, label) => {
    expect(formatDays(days)).toBe(label)
  })
})

describe('sortTodayItems', () => {
  const item = (id: string, time: string | null, done = false): TodayItem => ({
    kind: 'task',
    id,
    title: id,
    time,
    done,
  })

  it('puts unfinished first, then by time, anytime last; ties keep order', () => {
    const sorted = sortTodayItems([
      item('done-early', '06:00', true),
      item('anytime-a', null),
      item('late', '21:30'),
      item('done-anytime', null, true),
      item('early', '10:30'),
      item('anytime-b', null),
      item('noon', '14:00'),
    ])
    expect(sorted.map((i) => i.id)).toEqual([
      'early',
      'noon',
      'late',
      'anytime-a',
      'anytime-b',
      'done-early',
      'done-anytime',
    ])
  })

  it('does not change the input array', () => {
    const input = [item('b', null), item('a', '09:00')]
    sortTodayItems(input)
    expect(input.map((i) => i.id)).toEqual(['b', 'a'])
  })
})

describe('buildTodayItems', () => {
  const routineItems: TodayRoutineInput[] = [
    { id: 'wake', title: 'Wake up', days: WEEKDAYS, time: '06:00:00', active: true },
    { id: 'read', title: 'Read 20 pages', days: EVERY_DAY, time: '21:30:00', active: true },
    { id: 'gym', title: 'Morning workout', days: [true, false, true, false, true, false, false], time: '06:30:00', active: true },
    { id: 'old', title: 'Old habit', days: EVERY_DAY, time: null, active: false },
    { id: 'weekend', title: 'Long walk', days: [false, false, false, false, false, true, true], time: null, active: true },
  ]
  const checks = [
    { routine_item_id: 'wake', date: WED, done: true },
    { routine_item_id: 'read', date: WED, done: false },
    { routine_item_id: 'gym', date: '2026-10-27', done: true }, // another day
  ]
  const tasks: TodayTaskInput[] = [
    { id: 't1', title: 'Follow up with Emir', time: '10:30:00', due_date: WED, status: 'todo', tag: 'outreach', priority: 'high' },
    { id: 't2', title: 'Call accountant', time: null, due_date: WED, status: 'todo', tag: 'personal', priority: 'low' },
    { id: 't3', title: 'Update portfolio', time: null, due_date: WED, status: 'done', tag: 'work', priority: 'medium' },
    { id: 't4', title: 'Dropped one', time: null, due_date: WED, status: 'dropped', tag: null, priority: 'low' },
    { id: 't5', title: 'Yesterday task', time: null, due_date: '2026-10-27', status: 'todo', tag: null, priority: 'low' },
  ]

  it('merges scheduled routine items and tasks due that day, sorted', () => {
    const items = buildTodayItems(routineItems, checks, tasks, WED)
    expect(items.map((i) => i.id)).toEqual(['gym', 't1', 'read', 't2', 'wake', 't3'])
  })

  it('maps routine items with days and done from the check of that day', () => {
    const items = buildTodayItems(routineItems, checks, tasks, WED)
    expect(items.find((i) => i.id === 'wake')).toEqual({
      kind: 'routine',
      id: 'wake',
      title: 'Wake up',
      time: '06:00',
      done: true,
      days: WEEKDAYS,
    })
    expect(items.find((i) => i.id === 'gym')?.done).toBe(false)
  })

  it('maps tasks with tag, priority and status done', () => {
    const items = buildTodayItems(routineItems, checks, tasks, WED)
    expect(items.find((i) => i.id === 't1')).toEqual({
      kind: 'task',
      id: 't1',
      title: 'Follow up with Emir',
      time: '10:30',
      done: false,
      tag: 'outreach',
      priority: 'high',
    })
    expect(items.find((i) => i.id === 't3')?.done).toBe(true)
  })

  it('leaves out inactive items, other days and dropped tasks', () => {
    const ids = buildTodayItems(routineItems, checks, tasks, WED).map((i) => i.id)
    expect(ids).not.toContain('old')
    expect(ids).not.toContain('weekend')
    expect(ids).not.toContain('t4')
    expect(ids).not.toContain('t5')
  })

  it('returns an empty list for an empty day', () => {
    expect(buildTodayItems([], [], [], WED)).toEqual([])
  })
})
