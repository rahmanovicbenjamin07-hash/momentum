/**
 * Stats → Routine progress and Reports: routine-day rows from SQL → checks and
 * streak days for src/lib. Pure (tested in statsRoutine.test.ts).
 */
import type { RoutineDayRow } from '@/api/stats'
import type { RoutineCardData } from '@/components/routine/RoutineItemCards'
import { addDays, daysBetween, type DateKey } from '@/lib/dates'
import type { RoutineItemStats, RoutineStatsCheck } from '@/lib/routineStats'
import type { StreakDay } from '@/lib/streak'
import type { MissReason, RoutineItem } from '@/schemas/today'

/**
 * One item's ticks as checks for routineItemStats / routineTally.
 * SQL returns a row for every scheduled day; an unticked, unanswered today is
 * left out so it isn't counted as missed before the day is over.
 */
export function checksFromRows(rows: readonly RoutineDayRow[], itemId: string, today: DateKey): RoutineStatsCheck[] {
  return rows
    .filter((r) => r.routine_item_id === itemId)
    .filter((r) => !(r.day === today && !r.done && r.miss_reason === null))
    .map((r) => ({ date: r.day, done: r.done, miss_reason: r.miss_reason as MissReason | null }))
}

/** Scheduled / done per day from…to (every day present, so streaks don't break on empty days). */
export function streakDaysFromRows(rows: readonly RoutineDayRow[], from: DateKey, to: DateKey): StreakDay[] {
  const byDay = new Map<DateKey, StreakDay>()
  for (let i = 0; i <= daysBetween(from, to); i += 1) {
    const date = addDays(from, i)
    byDay.set(date, { date, scheduled: 0, done: 0 })
  }
  for (const r of rows) {
    const day = byDay.get(r.day)
    if (!day || !r.scheduled) continue
    day.scheduled += 1
    if (r.done) day.done += 1
  }
  return [...byDay.values()]
}

export function routineCards(
  items: readonly Pick<RoutineItem, 'id' | 'title' | 'days'>[],
  stats: ReadonlyMap<string, Pick<RoutineItemStats, 'done' | 'missed' | 'rate'>>,
): RoutineCardData[] {
  return items.map((item) => {
    const s = stats.get(item.id)
    return { id: item.id, title: item.title, days: item.days, done: s?.done ?? 0, missed: s?.missed ?? 0, rate: s?.rate ?? null }
  })
}

/** Years offered in the Year picker: this year and last year. */
export function statsYears(today: DateKey): number[] {
  const year = Number(today.slice(0, 4))
  return [year, year - 1]
}

/** First and last day loaded for a year: 1 Jan up to today (all of a past year). */
export function yearSpan(year: number, today: DateKey): { from: DateKey; to: DateKey } {
  const end = `${year}-12-31`
  return { from: `${year}-01-01`, to: today < end ? today : end }
}
