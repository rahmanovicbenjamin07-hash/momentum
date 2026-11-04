import { describe, expect, it } from 'vitest'
import { addDays } from '@/lib/dates'
import type { RoutineCheck, RoutineItem, Task } from '@/schemas/today'
import { checksRange, deriveTodayView, streakRange, STREAK_LOOKBACK_DAYS, type DayTotals } from './todayData'

const WED = '2026-10-28'
const TUE = '2026-10-27'
const THU = '2026-10-29'
const TZ = 'Europe/Sarajevo'
const EVERY_DAY = [true, true, true, true, true, true, true]
const BASE = { user_id: 'u', created_at: '2026-10-01T10:00:00+00:00' }

function routine(id: string, extra: Partial<RoutineItem> = {}): RoutineItem {
  return { ...BASE, id, title: id, days: EVERY_DAY, time: null, position: 0, active: true, ...extra }
}
function check(itemId: string, date: string, done: boolean): RoutineCheck {
  return { ...BASE, id: `${itemId}-${date}`, routine_item_id: itemId, date, done, miss_reason: null }
}
function task(id: string, due: string, status: Task['status'] = 'todo'): Task {
  return {
    ...BASE,
    id,
    title: id,
    notes: null,
    due_date: due,
    time: null,
    tag: null,
    priority: 'medium',
    status,
    completed_at: null,
    position: 0,
    contact_id: null,
  }
}

/** All `itemIds` done every day from `from` to `to`. */
function doneDays(itemIds: string[], from: string, to: string): RoutineCheck[] {
  const result: RoutineCheck[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) for (const id of itemIds) result.push(check(id, d, true))
  return result
}

/** Every day from `from` to `to` with `done` of `total` (database totals). */
function totals(from: string, to: string, done: number, total: number): DayTotals[] {
  const result: DayTotals[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) result.push({ day: d, done, total })
  return result
}

describe('streakRange', () => {
  it('covers the lookback up to today', () => {
    expect(streakRange(WED)).toEqual({ from: addDays(WED, -(STREAK_LOOKBACK_DAYS - 1)), to: WED })
  })
})

describe('checksRange', () => {
  it('covers the week (and yesterday) and ends tomorrow', () => {
    expect(checksRange(WED, WED)).toEqual({ from: '2026-10-26', to: THU })
    // Monday: yesterday (Sunday) is in the week before.
    expect(checksRange('2026-10-26', '2026-10-26').from).toBe('2026-10-25')
  })

  it('stretches to a viewed day in the future or far past', () => {
    expect(checksRange(WED, '2026-11-03').to).toBe('2026-11-03')
    expect(checksRange(WED, TUE).to).toBe(THU)
    expect(checksRange(WED, '2025-01-01').from).toBe('2025-01-01')
  })
})

describe('deriveTodayView', () => {
  const items = [routine('read'), routine('wake')]
  const checks = [...doneDays(['read', 'wake'], '2026-10-20', '2026-10-26'), check('wake', WED, true)]
  // Tue 27 missed both, Wed: wake done, read open.
  const tasks = [task('t1', WED, 'done'), task('t2', WED), task('t1', WED, 'done'), task('old', TUE, 'done')]
  const history = totals('2026-10-20', '2026-10-25', 2, 2)

  const view = deriveTodayView({
    today: WED,
    selected: WED,
    timeZone: TZ,
    routineItems: items,
    checks,
    history,
    tasks,
  })

  it('builds the day list without duplicate tasks', () => {
    expect(view.items.map((i) => i.id).sort()).toEqual(['read', 't1', 't2', 'wake'])
    expect(view.progress).toMatchObject({ done: 2, total: 4, percent: 50 })
    expect(view.openToday).toBe(2)
  })

  it('builds tomorrow’s list from routine days and tasks due tomorrow', () => {
    const v = deriveTodayView({
      today: WED,
      selected: WED,
      timeZone: TZ,
      routineItems: [...items, routine('wed-only', { days: [false, false, true, false, false, false, false] })],
      checks,
      history,
      tasks: [...tasks, task('plan', THU)],
    })
    expect(v.tomorrowItems.map((i) => i.id).sort()).toEqual(['plan', 'read', 'wake'])
    expect(v.tomorrowItems.every((i) => !i.done)).toBe(true)
    // Viewing another day doesn't move tomorrow.
    const other = deriveTodayView({
      today: WED,
      selected: TUE,
      timeZone: TZ,
      routineItems: items,
      checks,
      history,
      tasks: [task('plan', THU)],
    })
    expect(other.tomorrowItems.map((i) => i.id)).toContain('plan')
  })

  it('a day under 90% breaks the streak (no rest day)', () => {
    // Tue 27 was 1 of 3 done, Wed 28 still open
    expect(view.streak.days).toBe(0)
  })

  it('counts 90%+ days from the database and from this week’s loaded lists', () => {
    const v = deriveTodayView({
      today: WED,
      selected: WED,
      timeZone: TZ,
      routineItems: items,
      // Mon 26 and Tue 27 fully done (loaded lists); the database still says 0 for Monday.
      checks: doneDays(['read', 'wake'], '2026-10-26', TUE),
      tasks: [task('old', TUE, 'done')],
      history: [...history, { day: '2026-10-26', done: 0, total: 2 }],
    })
    // 20–27 Oct = 8 days; today (0 of 2) is still open and doesn’t break it.
    expect(v.streak.days).toBe(8)
    expect(v.streak.todayCounted).toBe(false)
  })

  it('a not-done task counts against the day', () => {
    const v = deriveTodayView({
      today: WED,
      selected: WED,
      timeZone: TZ,
      routineItems: [],
      checks: [],
      tasks: [task('a', WED, 'done'), task('b', WED, 'dropped')],
      history: [],
    })
    expect(v.items.find((i) => i.id === 'b')).toMatchObject({ done: false, missed: true })
    expect(v.progress).toMatchObject({ done: 1, total: 2 })
    expect(v.openToday).toBe(0)
    expect(v.streak.days).toBe(0)
  })

  it('asks about yesterday', () => {
    expect(view.missed.date).toBe(TUE)
    expect(view.missed.items.map((i) => i.id)).toEqual(['read', 'wake'])
  })

  it('fills the week strip Mon → today', () => {
    expect(view.week.days.slice(0, 3).map((d) => d.percent)).toEqual([100, 33, 50])
  })

  it('shows another day while keeping the badge and streak on the real today', () => {
    const other = deriveTodayView({
      today: WED,
      selected: TUE,
      timeZone: TZ,
      routineItems: items,
      checks,
      history,
      tasks,
    })
    expect(other.items.map((i) => i.id).sort()).toEqual(['old', 'read', 'wake'])
    expect(other.openToday).toBe(2)
    expect(other.streak.days).toBe(view.streak.days)
  })

  it('is empty and safe with no data', () => {
    const v = deriveTodayView({
      today: WED,
      selected: WED,
      timeZone: TZ,
      routineItems: [],
      checks: [],
      tasks: [],
      history: [],
    })
    expect(v.items).toEqual([])
    expect(v.streak.days).toBe(0)
    expect(v.missed.items).toEqual([])
  })
})
