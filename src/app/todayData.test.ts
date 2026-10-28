import { describe, expect, it } from 'vitest'
import { addDays } from '@/lib/dates'
import type { RoutineCheck, RoutineItem, Task } from '@/schemas/today'
import { checksRange, deriveTodayView, STREAK_LOOKBACK_DAYS } from './todayData'

const WED = '2026-10-28'
const TUE = '2026-10-27'
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

describe('checksRange', () => {
  it('covers the streak lookback and ends today', () => {
    expect(checksRange(WED, WED)).toEqual({ from: addDays(WED, -(STREAK_LOOKBACK_DAYS - 1)), to: WED })
  })

  it('stretches to a viewed day in the future or far past', () => {
    expect(checksRange(WED, '2026-11-03').to).toBe('2026-11-03')
    expect(checksRange(WED, '2025-01-01').from).toBe('2025-01-01')
  })
})

describe('deriveTodayView', () => {
  const items = [routine('read'), routine('wake')]
  const checks = [...doneDays(['read', 'wake'], '2026-10-20', '2026-10-26'), check('wake', WED, true)]
  // Tue 27 missed both (forgiven rest day), Wed: wake done, read open.
  const tasks = [task('t1', WED, 'done'), task('t2', WED), task('t1', WED, 'done'), task('old', TUE, 'done')]
  const { from } = checksRange(WED, WED)

  const view = deriveTodayView({
    today: WED,
    selected: WED,
    timeZone: TZ,
    routineItems: items,
    checks,
    checksFrom: from,
    tasks,
  })

  it('builds the day list without duplicate tasks', () => {
    expect(view.items.map((i) => i.id).sort()).toEqual(['read', 't1', 't2', 'wake'])
    expect(view.progress).toMatchObject({ done: 2, total: 4, percent: 50 })
    expect(view.openToday).toBe(2)
  })

  it('computes the streak with the rest day', () => {
    // 20–26 Oct complete (7 days), 27 forgiven, 28 still open
    expect(view.streak.days).toBe(7)
    expect(view.streak.forgivenDates).toEqual([TUE])
  })

  it('asks about yesterday and says the streak is safe', () => {
    expect(view.missed.date).toBe(TUE)
    expect(view.missed.items.map((i) => i.id)).toEqual(['read', 'wake'])
    expect(view.streakSafe).toBe(true)
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
      checksFrom: from,
      tasks,
    })
    expect(other.items.map((i) => i.id).sort()).toEqual(['old', 'read', 'wake'])
    expect(other.openToday).toBe(2)
    expect(other.streak.days).toBe(7)
  })

  it('does not count days before the loaded window as missed', () => {
    const longAgo = routine('long', { created_at: '2020-01-01T10:00:00+00:00' })
    const windowFrom = '2026-10-26'
    const v = deriveTodayView({
      today: WED,
      selected: WED,
      timeZone: TZ,
      routineItems: [longAgo],
      checks: doneDays(['long'], windowFrom, WED),
      checksFrom: windowFrom,
      tasks: [],
    })
    expect(v.streak.days).toBe(3)
  })

  it('is empty and safe with no data', () => {
    const v = deriveTodayView({
      today: WED,
      selected: WED,
      timeZone: TZ,
      routineItems: [],
      checks: [],
      checksFrom: from,
      tasks: [],
    })
    expect(v.items).toEqual([])
    expect(v.streak.days).toBe(0)
    expect(v.missed.items).toEqual([])
    expect(v.streakSafe).toBe(false)
  })
})
