import { addDays, daysBetween, type DateKey } from './dates'

export type ConsistencyCycle = {
  /** First day of the current round (the first square). */
  from: DateKey
  /** Last day of the current round (the last square). */
  to: DateKey
  /** Today's square, 1-based: 1 on the day you start, `length` on the last square. */
  day: number
}

/**
 * The Consistency grid fills one square per day from the day you started. When the last
 * square is reached, the next day starts again on the first one (a new round).
 * A start after today (clock or time-zone edge) counts as starting today.
 */
export function consistencyCycle(start: DateKey, today: DateKey, length: number): ConsistencyCycle {
  const elapsed = Math.max(0, daysBetween(start, today))
  const from = addDays(start > today ? today : start, Math.floor(elapsed / length) * length)
  return { from, to: addDays(from, length - 1), day: (elapsed % length) + 1 }
}
