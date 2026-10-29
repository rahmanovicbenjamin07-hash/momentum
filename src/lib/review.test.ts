import { describe, expect, it } from 'vitest'
import { experimentProgress, experimentResult, isoWeek, targetProgress, weekLabel, weekNumbers } from './review'

describe('weekLabel', () => {
  it('week inside one month', () => {
    expect(weekLabel('2026-10-19')).toBe('Week 43 · 19–25 Oct')
  })

  it('week across two months', () => {
    expect(weekLabel('2026-09-28')).toBe('Week 40 · 28 Sep–4 Oct')
  })

  it('ISO week numbers around New Year', () => {
    expect(weekLabel('2026-12-28')).toBe('Week 53 · 28 Dec–3 Jan') // 2026 has 53 weeks
    expect(weekLabel('2025-12-29')).toBe('Week 1 · 29 Dec–4 Jan') // its Thursday is 1 Jan 2026
    expect(isoWeek('2026-01-05')).toBe(2)
  })
})

describe('weekNumbers', () => {
  const WEEK = '2026-10-19' // Mon 19 – Sun 25 Oct 2026
  const wake = { id: 'r-wake', days: [true, true, true, true, true, false, false], active: true, created_at: '2026-01-01T06:00:00Z' }

  it('adds tasks and scheduled routine items, and counts outreach and meetings', () => {
    const numbers = weekNumbers({
      weekStart: WEEK,
      tasks: [
        { due_date: '2026-10-19', status: 'done' },
        { due_date: '2026-10-22', status: 'done' },
        { due_date: '2026-10-25', status: 'todo' },
        { due_date: '2026-10-21', status: 'dropped' }, // left out
        { due_date: '2026-10-26', status: 'done' }, // next week
      ],
      routineItems: [wake],
      // Mon–Thu done, Friday missed.
      routineChecks: ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22'].map((date) => ({ routine_item_id: 'r-wake', date, done: true })),
      touches: [
        { direction: 'sent', occurred_at: '2026-10-19T08:00:00Z' },
        { direction: 'sent', occurred_at: '2026-10-21T08:00:00Z' },
        { direction: 'sent', occurred_at: '2026-10-25T22:30:00Z' }, // 23:30 Sunday in Sarajevo: this week
        { direction: 'sent', occurred_at: '2026-10-25T23:30:00Z' }, // 00:30 Monday: next week
        { direction: 'received', occurred_at: '2026-10-20T09:00:00Z' },
        { direction: 'received', occurred_at: '2026-10-23T09:00:00Z' },
        { direction: 'note', occurred_at: '2026-10-23T10:00:00Z' },
      ],
      contactsStageHistory: [
        { to_stage: 'meeting', changed_at: '2026-10-20T10:00:00Z' },
        { to_stage: 'replied', changed_at: '2026-10-21T10:00:00Z' },
        { to_stage: 'meeting', changed_at: '2026-10-26T10:00:00Z' }, // next week
      ],
    })
    // (2 of 3 tasks + 4 of 5 wake-ups) = 6 of 8
    expect(numbers).toEqual({ task_completion: 75, outreach_sent: 3, replies: 2, meetings: 1 })
  })

  it('a week with nothing planned is 0%', () => {
    expect(
      weekNumbers({ weekStart: WEEK, tasks: [], routineItems: [], routineChecks: [], touches: [], contactsStageHistory: [] }),
    ).toEqual({ task_completion: 0, outreach_sent: 0, replies: 0, meetings: 0 })
  })
})

describe('experimentProgress', () => {
  const exp = { start_date: '2026-10-19', end_date: '2026-11-01' } // 14 days

  it('day 1, a day in the middle and the last day', () => {
    expect(experimentProgress(exp, '2026-10-19')).toEqual({ day: 1, totalDays: 14, pct: 7 })
    expect(experimentProgress(exp, '2026-10-28')).toEqual({ day: 10, totalDays: 14, pct: 71 })
    expect(experimentProgress(exp, '2026-11-01')).toEqual({ day: 14, totalDays: 14, pct: 100 })
  })

  it('before the start and after the end', () => {
    expect(experimentProgress(exp, '2026-10-10')).toMatchObject({ day: 0, pct: 0 })
    expect(experimentProgress(exp, '2026-11-20')).toMatchObject({ day: 14, pct: 100 })
  })
})

describe('experimentResult', () => {
  it('exactly 5% is a change; under 5% is "same"', () => {
    expect(experimentResult(20, 21)).toEqual({ change: 1, changePct: 5, verdict: 'better' })
    expect(experimentResult(20, 20.9).verdict).toBe('same')
    expect(experimentResult(20, 19.1).verdict).toBe('same')
    expect(experimentResult(20, 19)).toEqual({ change: -1, changePct: -5, verdict: 'worse' })
  })

  it('lower can be better', () => {
    expect(experimentResult(20, 15, false).verdict).toBe('better')
    expect(experimentResult(20, 25, false).verdict).toBe('worse')
  })

  it('from 0 there is no %', () => {
    expect(experimentResult(0, 0)).toEqual({ change: 0, changePct: null, verdict: 'same' })
    expect(experimentResult(0, 3)).toEqual({ change: 3, changePct: null, verdict: 'better' })
  })
})

describe('targetProgress', () => {
  it('caps at 100% and is on track once the target is met', () => {
    expect(targetProgress(15, 20)).toEqual({ pct: 75, onTrack: false })
    expect(targetProgress(20, 20)).toEqual({ pct: 100, onTrack: true })
    expect(targetProgress(30, 20)).toEqual({ pct: 100, onTrack: true })
    expect(targetProgress(0, 0)).toEqual({ pct: 100, onTrack: true })
  })
})
