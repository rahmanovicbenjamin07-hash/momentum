import { describe, expect, it } from 'vitest'
import { habitSeries, milestonesSeries, type GoalSeries } from '@/api/goals'
import type { Goal, Milestone, Objective } from '@/schemas/goals'
import { habitWeekDays, keyResultSummary, keyResultsOf, objectiveSummary, reportGoalRows } from './goalsView'

const today = '2026-10-28'
const USER = '00000000-0000-4000-8000-000000000001'
const CREATED = '2026-10-01T08:00:00+00:00'

function kr(fields: Partial<Goal>): Goal {
  return {
    id: 'kr',
    user_id: USER,
    objective_id: 'obj',
    kind: 'number',
    completed_on: null,
    title: 'Key result',
    short_label: 'Key result',
    type: 'total',
    source_kind: 'manual',
    source_id: null,
    unit: 'eur',
    target: 10000,
    start_value: 0,
    start_date: '2026-10-01',
    deadline: '2026-12-31',
    include_pipeline: false,
    created_at: CREATED,
    ...fields,
  }
}
const objective: Objective = { id: 'obj', user_id: USER, title: 'Launch my studio', why: null, created_at: CREATED }
const step = (id: string, position: number, done_on: string | null, due_date: string | null = null): Milestone => ({
  id, user_id: USER, goal_id: 'steps', title: id, due_date, done_on, position, created_at: CREATED,
})
const summary = (goal: Goal, series: GoalSeries) =>
  keyResultSummary({ goal, series, source: { name: 'Ticked by hand', unit: 'days' }, today, pipeline: 0 })

describe('keyResultSummary', () => {
  it('steps: done count, overdue and line', () => {
    const goal = kr({ id: 'steps', kind: 'milestones', target: 1, unit: null })
    const s = summary(goal, milestonesSeries([step('a', 0, '2026-10-05'), step('b', 1, null, '2026-10-20'), step('c', 2, null)]))
    expect(s).toMatchObject({ percent: 33, status: 'slightly_behind', progress: '1 of 3 steps done · 1 overdue', line: 'STEPS · deadline 31 Dec 2026' })
  })

  it('habit: weeks hit and streak', () => {
    // Mon 5 Oct start, 3× a week; weeks of 5, 12 and 19 Oct all hit.
    const goal = kr({ kind: 'habit', target: 3, unit: null, start_date: '2026-10-05', deadline: '2026-11-29' })
    const days = ['05', '06', '07', '12', '13', '14', '19', '20', '21'].map((d) => `2026-10-${d}`)
    expect(summary(goal, habitSeries(days))).toMatchObject({
      percent: 37,
      status: 'on_track',
      progress: '3 of 8 weeks hit · 3-week streak',
      line: 'HABIT · Ticked by hand · 3× a week · until 29 Nov 2026',
    })
  })

  it('done / not done: days left, or the day it was done', () => {
    expect(summary(kr({ kind: 'done', target: 1, deadline: '2026-10-30' }), { months: [], current: 0 })).toMatchObject({
      percent: 0,
      status: 'on_track',
      progress: 'Not done yet · 2 days left',
    })
    expect(summary(kr({ kind: 'done', target: 1, completed_on: '2026-10-20' }), { months: [], current: 1 })).toMatchObject({
      percent: 100,
      status: 'reached',
      progress: 'Done on 20 Oct 2026',
    })
  })

  it('number: percent from the starting point, text from the goal view', () => {
    const goal = kr({ start_value: 2000, target: 10000 })
    const s = keyResultSummary({ goal, series: { months: [], current: 6000 }, source: { name: 'Updated by hand', unit: 'eur' }, today, pipeline: 0 })
    expect(s).toMatchObject({ percent: 50, progress: '€6,000 of €10,000 · started at €2,000' })
  })
})

describe('objectives', () => {
  it('groups key results, averages them and names the latest deadline', () => {
    const goals = [kr({ id: 'a', kind: 'done', completed_on: '2026-10-02', deadline: '2026-11-01' }), kr({ id: 'b', kind: 'done', deadline: '2027-03-31' }), kr({ id: 'other', objective_id: 'x' })]
    const mine = keyResultsOf('obj', goals)
    expect(mine.map((g) => g.id)).toEqual(['a', 'b'])
    const rows = mine.map((goal) => ({ goal, summary: summary(goal, { months: [], current: goal.completed_on ? 1 : 0 }) }))
    expect(objectiveSummary(objective, rows)).toMatchObject({ percent: 50, status: 'on_track', line: '2 KEY RESULTS · BY 31 MAR 2027' })
    expect(objectiveSummary(objective, [])).toMatchObject({ status: null, line: 'NO KEY RESULTS YET' })
  })

  it('Reports: one row per objective with key results', () => {
    const goals = [kr({ id: 'a', kind: 'done', completed_on: '2026-10-02' })]
    const rows = reportGoalRows([objective, { ...objective, id: 'empty', title: 'Empty' }], goals, new Map(), () => ({ name: '', unit: 'count' }), today, 0)
    expect(rows).toEqual([{ id: 'obj', title: 'Launch my studio', status: 'ahead', label: 'Reached' }])
  })
})

describe('habitWeekDays', () => {
  it('this week Mon → Sun; future days and days outside the dates are disabled', () => {
    const days = habitWeekDays({ start_date: '2026-10-27', deadline: '2026-12-31' }, ['2026-10-27'], today)
    expect(days.map((d) => d.weekday)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    expect(days.map((d) => d.disabled)).toEqual([true, false, false, true, true, true, true])
    expect(days[1]).toMatchObject({ date: '2026-10-27', done: true })
  })
})
