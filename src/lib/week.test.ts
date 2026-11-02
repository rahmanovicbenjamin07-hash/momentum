import { describe, expect, it } from 'vitest'
import type { TodayRoutineInput, TodayTaskInput } from './todayList'
import { weekColumns, weekFromParam, weekRangeLabel, weekTitle } from './week'

const WEEKDAYS = [true, true, true, true, true, false, false]
const TODAY = '2026-11-04' // Wednesday

const wake: TodayRoutineInput = { id: 'r1', title: 'Wake up', days: WEEKDAYS, time: '06:00:00', active: true }

function task(id: string, due: string, status: TodayTaskInput['status'] = 'todo'): TodayTaskInput {
  return { id, title: `Task ${id}`, time: null, due_date: due, status, tag: null, priority: 'medium' }
}

describe('weekColumns', () => {
  const columns = weekColumns({
    day: TODAY,
    today: TODAY,
    routineItems: [wake],
    checks: [
      { routine_item_id: 'r1', date: '2026-11-02', done: true },
      { routine_item_id: 'r1', date: '2026-11-03', done: false },
    ],
    tasks: [task('a', '2026-11-02', 'done'), task('b', '2026-11-04'), task('b', '2026-11-04'), task('c', '2026-11-08'), task('d', '2026-11-05', 'dropped')],
  })

  it('has one column per day, Monday to Sunday, with today marked', () => {
    expect(columns.map((c) => c.date)).toEqual([
      '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08',
    ])
    expect(columns.map((c) => (c.isToday ? 'T' : c.isPast ? 'P' : 'F')).join('')).toBe('PPTFFFF')
  })

  it('puts repeating items on their weekdays and tasks on their due date (once, without dropped ones)', () => {
    expect(columns.map((c) => c.items.map((i) => i.id).join(','))).toEqual(['r1,a', 'r1', 'r1,b', 'r1', 'r1', '', 'c'])
  })

  it('counts each day: done, total and percent (null when nothing is planned)', () => {
    expect(columns.map((c) => [c.done, c.total, c.percent])).toEqual([
      [2, 2, 100],
      [0, 1, 0],
      [0, 2, 0],
      [0, 1, 0],
      [0, 1, 0],
      [0, 0, null],
      [0, 1, 0],
    ])
  })

  it('can start on Sunday', () => {
    const sunday = weekColumns({ day: TODAY, today: TODAY, weekStartsOn: 0, routineItems: [], checks: [], tasks: [] })
    expect(sunday[0]?.date).toBe('2026-11-01')
  })
})

describe('weekFromParam', () => {
  it('gives the first day of the week a date falls in, or of this week', () => {
    expect(weekFromParam('2026-11-12', TODAY)).toBe('2026-11-09')
    expect(weekFromParam(null, TODAY)).toBe('2026-11-02')
    expect(weekFromParam('next week', TODAY)).toBe('2026-11-02')
  })
})

describe('weekRangeLabel', () => {
  it('writes the 7 days short, with month and year once where they match', () => {
    expect(weekRangeLabel('2026-11-02')).toBe('2 – 8 Nov 2026')
    expect(weekRangeLabel('2026-11-30')).toBe('30 Nov – 6 Dec 2026')
    expect(weekRangeLabel('2026-12-28')).toBe('28 Dec 2026 – 3 Jan 2027')
  })
})

describe('weekTitle', () => {
  it('names the weeks around today', () => {
    expect(weekTitle('2026-11-02', TODAY)).toBe('This week')
    expect(weekTitle('2026-11-09', TODAY)).toBe('Next week')
    expect(weekTitle('2026-10-26', TODAY)).toBe('Last week')
    expect(weekTitle('2026-11-16', TODAY)).toBe('Week')
  })
})
