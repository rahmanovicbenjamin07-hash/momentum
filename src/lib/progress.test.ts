import { describe, expect, it } from 'vitest'
import type { TodayItem } from '@/schemas/today'
import { missedYesterday, todayProgress, weekProgress } from './progress'
import type { TodayRoutineInput, TodayTaskInput } from './todayList'

const EVERY_DAY = [true, true, true, true, true, true, true]
const WEEKDAYS = [true, true, true, true, true, false, false]
const MON = '2026-10-26'
const TUE = '2026-10-27'
const WED = '2026-10-28'

describe('todayProgress', () => {
  const item = (kind: TodayItem['kind'], done: boolean): TodayItem => ({
    kind,
    id: crypto.randomUUID(),
    title: 'x',
    time: null,
    done,
  })

  it('matches the design: 5 of 11, Repeating 3/5, One-off 2/6 = 45%', () => {
    const items = [
      ...[true, true, true, false, false].map((d) => item('routine', d)),
      ...[true, true, false, false, false, false].map((d) => item('task', d)),
    ]
    expect(todayProgress(items)).toEqual({
      done: 5,
      total: 11,
      percent: 45,
      routine: { done: 3, total: 5 },
      oneOff: { done: 2, total: 6 },
    })
  })

  it('is 0% with nothing to do', () => {
    expect(todayProgress([])).toEqual({
      done: 0,
      total: 0,
      percent: 0,
      routine: { done: 0, total: 0 },
      oneOff: { done: 0, total: 0 },
    })
  })

  it('is 100% when all done', () => {
    expect(todayProgress([item('routine', true), item('task', true)]).percent).toBe(100)
  })
})

describe('weekProgress', () => {
  const routineItems: TodayRoutineInput[] = [
    { id: 'wake', title: 'Wake up', days: WEEKDAYS, time: '06:00:00', active: true },
    { id: 'read', title: 'Read', days: EVERY_DAY, time: null, active: true },
  ]
  const checks = [
    { routine_item_id: 'wake', date: MON, done: true },
    { routine_item_id: 'read', date: MON, done: true },
    { routine_item_id: 'wake', date: TUE, done: true },
    { routine_item_id: 'read', date: TUE, done: false },
    { routine_item_id: 'wake', date: WED, done: true },
  ]
  const tasks: TodayTaskInput[] = [
    { id: 't1', title: 'A', time: null, due_date: MON, status: 'done', tag: null, priority: 'low' },
    { id: 't2', title: 'B', time: null, due_date: TUE, status: 'todo', tag: null, priority: 'low' },
    { id: 't3', title: 'C', time: null, due_date: WED, status: 'done', tag: null, priority: 'low' },
    { id: 't4', title: 'D', time: null, due_date: WED, status: 'todo', tag: null, priority: 'low' },
    { id: 't5', title: 'Future', time: null, due_date: '2026-10-30', status: 'todo', tag: null, priority: 'low' },
    { id: 't6', title: 'Last week', time: null, due_date: '2026-10-25', status: 'done', tag: null, priority: 'low' },
  ]

  const result = weekProgress({ routineItems, checks, tasks, today: WED })

  it('gives a Mon → Sun strip with % per day up to today', () => {
    expect(result.days.map((d) => [d.date, d.done, d.total, d.percent])).toEqual([
      [MON, 3, 3, 100],
      [TUE, 1, 3, 33],
      [WED, 2, 4, 50],
      ['2026-10-29', 0, 0, null],
      ['2026-10-30', 0, 0, null],
      ['2026-10-31', 0, 0, null],
      ['2026-11-01', 0, 0, null],
    ])
    expect(result.days.map((d) => d.isToday)).toEqual([false, false, true, false, false, false, false])
    expect(result.days.map((d) => d.isFuture)).toEqual([false, false, false, true, true, true, true])
  })

  it('totals Mon → today only (future and last week ignored)', () => {
    expect(result.all).toEqual({ done: 6, total: 10 })
    expect(result.routine).toEqual({ done: 4, total: 6 })
    expect(result.oneOff).toEqual({ done: 2, total: 4 })
    expect(result.percent).toBe(60)
  })

  it('on Monday covers just Monday', () => {
    const monday = weekProgress({ routineItems, checks, tasks, today: MON })
    expect(monday.all).toEqual({ done: 3, total: 3 })
    expect(monday.days.filter((d) => !d.isFuture)).toHaveLength(1)
  })

  it('shows null % for a past day with nothing to do', () => {
    const empty = weekProgress({ routineItems: [], checks: [], tasks: [], today: WED })
    expect(empty.days[0]?.percent).toBeNull()
    expect(empty.percent).toBe(0)
  })

  it('does not count items before they were created', () => {
    const newItem = [{ ...routineItems[1]!, created_at: '2026-10-28T08:00:00+00:00' }]
    const r = weekProgress({ routineItems: newItem, checks: [], tasks: [], today: WED })
    expect(r.days.slice(0, 3).map((d) => d.total)).toEqual([0, 0, 1])
  })
})

describe('missedYesterday', () => {
  const routineItems: TodayRoutineInput[] = [
    { id: 'wake', title: 'Wake up', days: WEEKDAYS, time: null, active: true },
    { id: 'read', title: 'Read 20 pages', days: EVERY_DAY, time: null, active: true },
    { id: 'gym', title: 'Gym', days: EVERY_DAY, time: null, active: true },
    { id: 'walk', title: 'Weekend walk', days: [false, false, false, false, false, true, true], time: null, active: true },
    { id: 'off', title: 'Paused', days: EVERY_DAY, time: null, active: false },
  ]

  it('lists items scheduled yesterday that were not done and have no reason yet', () => {
    const checks = [
      { routine_item_id: 'wake', date: TUE, done: true, miss_reason: null },
      { routine_item_id: 'gym', date: TUE, done: false, miss_reason: 'Tired' as const },
      { routine_item_id: 'read', date: WED, done: true, miss_reason: null }, // today, not yesterday
    ]
    const result = missedYesterday(routineItems, checks, WED)
    expect(result.date).toBe(TUE)
    expect(result.items.map((i) => i.id)).toEqual(['read'])
  })

  it('counts an unchecked item (no row) as missed', () => {
    expect(missedYesterday(routineItems, [], WED).items.map((i) => i.id)).toEqual(['wake', 'read', 'gym'])
  })

  it('looks at the weekend on Monday', () => {
    expect(missedYesterday(routineItems, [], MON).items.map((i) => i.id)).toEqual(['read', 'gym', 'walk'])
  })

  it('ignores items created today', () => {
    const fresh = [{ ...routineItems[1]!, created_at: '2026-10-28T08:00:00+00:00' }]
    expect(missedYesterday(fresh, [], WED).items).toEqual([])
  })

  it('keeps the full item objects', () => {
    const items = missedYesterday(routineItems, [], WED).items
    expect(items[0]).toBe(routineItems[0])
  })
})
