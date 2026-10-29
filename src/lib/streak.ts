import { addDays, dayIndex, daysBetween, weekStart, type DateKey } from './dates'
import { STREAK_LEVELS, streakLevelForDays, type StreakLevel } from './streak-levels'

// ---------------------------------------------------------------------------
// Daily summaries
// ---------------------------------------------------------------------------

/** How one calendar day went for the routine. */
export type StreakDay = {
  date: DateKey
  /** Routine items scheduled that day. */
  scheduled: number
  /** How many of those were done. */
  done: number
}

/** Minimal routine item shape needed for the streak. */
export type StreakRoutineItem = {
  id: string
  /** Mon..Sun */
  days: readonly boolean[]
  active: boolean
  /** Calendar day the item was created (user's time zone). It isn't due before that. */
  createdOn: DateKey
}

export type StreakCheck = {
  routine_item_id: string
  date: DateKey
  done: boolean
}

/**
 * Builds one StreakDay per date from the first active item's creation day up to `today`.
 * Inactive items are ignored.
 */
export function buildStreakDays(
  items: readonly StreakRoutineItem[],
  checks: readonly StreakCheck[],
  today: DateKey,
): StreakDay[] {
  const active = items.filter((item) => item.active)
  if (active.length === 0) return []

  const first = active.reduce((min, item) => (item.createdOn < min ? item.createdOn : min), today)
  const doneSet = new Set(checks.filter((c) => c.done).map((c) => `${c.routine_item_id}|${c.date}`))

  const result: StreakDay[] = []
  const total = daysBetween(first, today)
  for (let i = 0; i <= total; i++) {
    const date = addDays(first, i)
    const weekday = dayIndex(date) // Mon = 0
    let scheduled = 0
    let done = 0
    for (const item of active) {
      if (item.createdOn > date || !item.days[weekday]) continue
      scheduled++
      if (doneSet.has(`${item.id}|${date}`)) done++
    }
    result.push({ date, scheduled, done })
  }
  return result
}

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

export type StreakResult = {
  /** Length of the streak in counted days (forgiven days bridge the gap but don't add). */
  days: number
  /** True when today already counts. */
  todayCounted: boolean
  /** Most recent counted day, or null when there is no streak. */
  lastCountedDate: DateKey | null
  /** Missed days that were forgiven inside the streak (newest first). */
  forgivenDates: DateKey[]
}

/** A day counts when every routine item scheduled that day is done (nothing scheduled = counts). */
export function dayCounts(day: StreakDay): boolean {
  return day.done >= day.scheduled
}

/**
 * Current streak:
 * - A day counts when all items scheduled that day are done.
 * - One missed day per Mon–Sun week is forgiven (a "rest day").
 * - The streak ends today or yesterday: an unfinished today doesn't break it.
 * - Days missing from `days` (before tracking started) end the streak.
 */
export function computeStreak(days: readonly StreakDay[], today: DateKey): StreakResult {
  const byDate = new Map(days.map((d) => [d.date, d]))
  const todayDay = byDate.get(today)
  const todayCounted = todayDay ? dayCounts(todayDay) : false

  let count = 0
  let lastCountedDate: DateKey | null = null
  const forgivenDates: DateKey[] = []
  const pendingForgiven: DateKey[] = [] // only kept if a counted day follows (further back)
  const weeksUsed = new Set<DateKey>()

  let date = todayCounted ? today : addDays(today, -1)
  for (;;) {
    const day = byDate.get(date)
    if (!day) break

    if (dayCounts(day)) {
      count++
      lastCountedDate ??= date
      forgivenDates.push(...pendingForgiven)
      pendingForgiven.length = 0
    } else {
      const week = weekStart(date)
      if (weeksUsed.has(week)) break
      weeksUsed.add(week)
      pendingForgiven.push(date)
    }
    date = addDays(date, -1)
  }

  return { days: count, todayCounted, lastCountedDate, forgivenDates }
}

/**
 * Longest streak inside `days` (same rules as computeStreak: one forgiven day per week).
 * Days outside the list don't count, so pass e.g. one month to get that month's best.
 */
export function longestStreak(days: readonly StreakDay[]): number {
  let best = 0
  for (const day of days) best = Math.max(best, computeStreak(days, day.date).days)
  return best
}

// ---------------------------------------------------------------------------
// Tiers (levels + progress to the next one)
// ---------------------------------------------------------------------------

/** Milestones after Legend (100): 150, 200, 365, then every 365 days. */
export function legendMilestoneAfter(days: number): number {
  for (const milestone of [150, 200, 365]) {
    if (days < milestone) return milestone
  }
  return (Math.floor(days / 365) + 1) * 365
}

function previousLegendMilestone(next: number): number {
  if (next === 150) return 100
  if (next === 200) return 150
  if (next === 365) return 200
  return next - 365
}

export type StreakTier = {
  level: StreakLevel
  colors: StreakLevel['colors']
  sparkles: boolean
  /** Next level, or the next milestone after Legend. */
  nextLevel: {
    name: string
    atDays: number
    /** True for post-Legend milestones (150, 200, 365…). */
    isMilestone: boolean
  }
  daysToNext: number
  /** 0–1 progress from the current level/milestone to the next. */
  progress: number
}

export function getStreakTier(days: number): StreakTier {
  const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 0
  const level = streakLevelForDays(safeDays)
  const index = STREAK_LEVELS.indexOf(level)
  const next = STREAK_LEVELS[index + 1]

  let from: number
  let nextLevel: StreakTier['nextLevel']
  if (next) {
    from = level.minDays
    nextLevel = { name: next.name, atDays: next.minDays, isMilestone: false }
  } else {
    const atDays = legendMilestoneAfter(safeDays)
    from = previousLegendMilestone(atDays)
    nextLevel = { name: `${atDays} days`, atDays, isMilestone: true }
  }

  const span = nextLevel.atDays - from
  const progress = span > 0 ? Math.min(1, Math.max(0, (safeDays - from) / span)) : 0

  return {
    level,
    colors: level.colors,
    sparkles: level.sparkles,
    nextLevel,
    daysToNext: nextLevel.atDays - safeDays,
    progress,
  }
}
