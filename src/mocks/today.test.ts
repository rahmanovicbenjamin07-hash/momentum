import { describe, expect, it } from 'vitest'
import { countTodayItems } from '@/lib/today-list'
import { routineItemSchema, taskSchema, todayItemSchema } from '@/schemas/today'
import { mockMissedYesterday, mockOverdueTasks, mockRoutineItems, mockTodayItems, mockWeekProgress } from './today'

describe('today mocks', () => {
  it('match the Zod schemas', () => {
    for (const row of mockRoutineItems) expect(routineItemSchema.parse(row)).toEqual(row)
    for (const row of mockTodayItems) expect(todayItemSchema.parse(row)).toEqual(row)
    for (const row of mockOverdueTasks) expect(taskSchema.parse(row)).toEqual(row)
  })

  it('match the design numbers (5/11, repeating 3/5, one-off 2/6)', () => {
    expect(countTodayItems(mockTodayItems)).toEqual({ all: 11, routine: 5, task: 6, done: 5, routineDone: 3, taskDone: 2 })
  })

  it('has the missed item from the design', () => {
    expect(mockMissedYesterday.map((r) => r.title)).toEqual(['Read 20 pages'])
  })
})

describe('week mock', () => {
  it('adds up: days sum to the totals, and the percent matches', () => {
    const sum = mockWeekProgress.days.reduce((a, d) => ({ done: a.done + d.done, total: a.total + d.total }), { done: 0, total: 0 })
    expect(sum).toEqual(mockWeekProgress.all)
    expect(mockWeekProgress.routine.done + mockWeekProgress.oneOff.done).toBe(mockWeekProgress.all.done)
    expect(Math.round((sum.done / sum.total) * 100)).toBe(mockWeekProgress.percent)
  })
})
