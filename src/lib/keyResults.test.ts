import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import {
  doneProgress,
  habitProgress,
  milestoneProgress,
  numberPercent,
  objectiveProgress,
} from './keyResults'

// Wednesday.
const today = '2026-10-28'

describe('numberPercent', () => {
  it('total: share of the way from the starting point to the target', () => {
    expect(numberPercent({ type: 'total', current: 6500, startValue: 3000, target: 10000 })).toBe(50)
    expect(numberPercent({ type: 'total', current: 2000, startValue: 3000, target: 10000 })).toBe(0)
    expect(numberPercent({ type: 'total', current: 12000, startValue: 0, target: 10000 })).toBe(100)
  })

  it('floors, so it shows 100% only once reached', () => {
    expect(numberPercent({ type: 'total', current: 9996, startValue: 0, target: 10000 })).toBe(99)
  })

  it('level: best month ÷ target', () => {
    expect(numberPercent({ type: 'level', current: 2250, startValue: 0, target: 3000 })).toBe(75)
  })
})

describe('milestoneProgress', () => {
  const step = (id: string, position: number, due_date: string | null = null, done_on: string | null = null) => ({
    id,
    position,
    due_date,
    done_on,
  })
  // 1 Oct → 31 Dec: on 28 Oct about 30% of the time is gone.
  const dates = { startDate: '2026-10-01', deadline: '2026-12-31', today }

  it('counts done steps and finds the next one by position', () => {
    const result = milestoneProgress({ ...dates, milestones: [step('b', 1), step('a', 0, null, '2026-10-10'), step('c', 2)] })
    expect(result).toMatchObject({ done: 1, total: 3, percent: 33, overdue: 0, status: 'on_track' })
    expect(result.next?.id).toBe('b')
  })

  it('all done → reached', () => {
    const result = milestoneProgress({ ...dates, milestones: [step('a', 0, null, '2026-10-10')] })
    expect(result).toMatchObject({ percent: 100, status: 'reached', next: null })
  })

  it('overdue steps: one → slightly behind, two → behind', () => {
    const one = [step('a', 0, '2026-10-20'), step('b', 1, '2026-11-20')]
    expect(milestoneProgress({ ...dates, milestones: one })).toMatchObject({ overdue: 1, status: 'slightly_behind' })
    const two = [step('a', 0, '2026-10-20'), step('b', 1, '2026-10-27')]
    expect(milestoneProgress({ ...dates, milestones: two })).toMatchObject({ overdue: 2, status: 'behind' })
    // Due today isn't late yet.
    expect(milestoneProgress({ ...dates, milestones: [step('a', 0, today)] }).overdue).toBe(0)
  })

  it('no due dates: compares steps done with time gone', () => {
    const four = ['a', 'b', 'c', 'd'].map((id, i) => step(id, i))
    // Late November, nothing done: ~65% of the time gone, 0% done.
    expect(milestoneProgress({ ...dates, today: '2026-11-28', milestones: four }).status).toBe('slightly_behind')
    // 3 of 4 done with ~30% of the time gone.
    const ahead = four.map((s, i) => (i < 3 ? { ...s, done_on: '2026-10-20' } : s))
    expect(milestoneProgress({ ...dates, milestones: ahead }).status).toBe('ahead')
  })

  it('past the deadline and not finished → off track; no steps → 0%', () => {
    expect(milestoneProgress({ ...dates, today: '2027-01-01', milestones: [step('a', 0)] }).status).toBe('off_track')
    expect(milestoneProgress({ ...dates, milestones: [] })).toMatchObject({ percent: 0, total: 0, next: null })
  })
})

describe('habitProgress', () => {
  /** Ticks on the given weekdays (0 = Mon) of every week from `from` for `weeks` weeks. */
  function ticks(from: string, weeks: number, weekdays: number[]): string[] {
    const out: string[] = []
    for (let w = 0; w < weeks; w++) for (const d of weekdays) out.push(addDays(from, w * 7 + d))
    return out
  }
  // Mon 5 Oct → Sun 29 Nov 2026: 8 weeks. Today (Wed 28 Oct) is in week 4.
  const base = { perWeek: 3, startDate: '2026-10-05', deadline: '2026-11-29', today }

  it('3 finished weeks all hit, this week not yet: 3 of 8 weeks, rate 100%', () => {
    const result = habitProgress({ ...base, doneDates: [...ticks('2026-10-05', 3, [0, 2, 4]), '2026-10-26'] })
    expect(result).toMatchObject({ weeksHit: 3, weeksCounted: 3, totalWeeks: 8, rate: 1, streak: 3, percent: 37, status: 'on_track' })
    expect(result.weeks).toHaveLength(4)
    expect(result.thisWeek).toMatchObject({ start: '2026-10-26', count: 1, needed: 3, hit: false, current: true })
  })

  it('this week counts once it is hit', () => {
    const result = habitProgress({ ...base, doneDates: [...ticks('2026-10-05', 4, [0, 1, 2])] })
    expect(result).toMatchObject({ weeksHit: 4, weeksCounted: 4, streak: 4, status: 'ahead' })
  })

  it('missed weeks pull the rate down and break the streak', () => {
    // Week 1 hit, week 2 missed (1 tick), week 3 hit.
    const doneDates = [...ticks('2026-10-05', 1, [0, 1, 2]), '2026-10-12', ...ticks('2026-10-19', 1, [0, 1, 2])]
    const result = habitProgress({ ...base, doneDates })
    expect(result).toMatchObject({ weeksHit: 2, weeksCounted: 3, streak: 1, status: 'slightly_behind' })
    expect(result.rate).toBeCloseTo(2 / 3)
    expect(habitProgress({ ...base, doneDates: [] }).status).toBe('off_track')
  })

  it('a first week cut short needs fewer ticks', () => {
    // Starts on Saturday 10 Oct: only Sat + Sun are inside, so 2 ticks are enough.
    const result = habitProgress({ ...base, startDate: '2026-10-10', doneDates: ['2026-10-10', '2026-10-11'] })
    expect(result.weeks[0]).toMatchObject({ start: '2026-10-05', needed: 2, count: 2, hit: true })
  })

  it('ignores ticks outside the dates, and nothing counts before the start', () => {
    const result = habitProgress({ ...base, startDate: '2026-11-02', doneDates: ['2026-10-26', '2026-10-27'] })
    expect(result).toMatchObject({ weeks: [], weeksCounted: 0, rate: null, status: 'on_track', percent: 0 })
  })

  it('after the deadline: reached at 80% of weeks or more, else off track', () => {
    const after = { ...base, today: '2026-12-05' }
    expect(habitProgress({ ...after, doneDates: ticks('2026-10-05', 7, [0, 1, 2]) })).toMatchObject({ weeksHit: 7, status: 'reached' })
    expect(habitProgress({ ...after, doneDates: ticks('2026-10-05', 5, [0, 1, 2]) }).status).toBe('off_track')
  })
})

describe('doneProgress', () => {
  it('done → reached; otherwise on track until the deadline', () => {
    expect(doneProgress({ completedOn: '2026-10-01', deadline: '2026-12-01', today })).toEqual({ percent: 100, status: 'reached' })
    expect(doneProgress({ completedOn: null, deadline: '2026-12-01', today })).toEqual({ percent: 0, status: 'on_track' })
    expect(doneProgress({ completedOn: null, deadline: '2026-10-27', today }).status).toBe('off_track')
  })
})

describe('objectiveProgress', () => {
  it('averages the percents; status is the worst key result not yet reached', () => {
    expect(
      objectiveProgress([
        { percent: 100, status: 'reached' },
        { percent: 50, status: 'ahead' },
        { percent: 21, status: 'slightly_behind' },
      ]),
    ).toEqual({ percent: 57, status: 'slightly_behind' })
  })

  it('all reached → reached; none → no status', () => {
    expect(objectiveProgress([{ percent: 100, status: 'reached' }])).toEqual({ percent: 100, status: 'reached' })
    expect(objectiveProgress([])).toEqual({ percent: 0, status: null })
  })
})
