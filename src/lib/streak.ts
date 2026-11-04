import { addDays, type DateKey } from './dates'
import { STREAK_LEVELS, streakLevelForDays, type StreakLevel } from './streak-levels'

// ---------------------------------------------------------------------------
// Daily summaries
// ---------------------------------------------------------------------------

/** How one calendar day went: everything planned (tasks + repeating items) and how much got done. */
export type StreakDay = {
  date: DateKey
  /** Tasks and repeating items planned that day. */
  scheduled: number
  /** How many of those were done. */
  done: number
}

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

export type StreakResult = {
  /** Length of the streak in counted days. */
  days: number
  /** True when today already counts. */
  todayCounted: boolean
  /** Most recent counted day, or null when there is no streak. */
  lastCountedDate: DateKey | null
}

/** A day counts when at least this % of everything planned that day is done. */
export const STREAK_PERCENT = 90

/** At least 90% done (whole numbers, so 27 of 30 counts). A day with nothing planned doesn't count. */
export function dayCounts(day: StreakDay): boolean {
  return day.scheduled > 0 && day.done * 100 >= day.scheduled * STREAK_PERCENT
}

/**
 * Current streak:
 * - A day counts when at least 90% of what was planned that day is done.
 * - Days with nothing planned are skipped: they don't add and don't break it.
 * - The streak ends today or yesterday: an unfinished today doesn't break it.
 * - Days missing from `days` (before tracking started) end the streak.
 */
export function computeStreak(days: readonly StreakDay[], today: DateKey): StreakResult {
  const byDate = new Map(days.map((d) => [d.date, d]))
  const todayDay = byDate.get(today)
  const todayCounted = todayDay ? dayCounts(todayDay) : false

  let count = 0
  let lastCountedDate: DateKey | null = null

  let date = todayCounted ? today : addDays(today, -1)
  for (;;) {
    const day = byDate.get(date)
    if (!day) break
    if (dayCounts(day)) {
      count++
      lastCountedDate ??= date
    } else if (day.scheduled > 0) {
      break
    }
    date = addDays(date, -1)
  }

  return { days: count, todayCounted, lastCountedDate }
}

/**
 * Longest streak inside `days` (same rules as computeStreak).
 * Days outside the list don't count, so pass e.g. one month to get that month's best.
 */
export function longestStreak(days: readonly StreakDay[]): number {
  let best = 0
  let run = 0
  for (const day of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    if (dayCounts(day)) best = Math.max(best, ++run)
    else if (day.scheduled > 0) run = 0
  }
  return best
}

/** Per-day totals (stats_daily_completion rows: tasks + repeating items) → StreakDays. */
export function streakDaysFromTotals(rows: readonly { day: DateKey; total: number; done: number }[]): StreakDay[] {
  return rows.map((r) => ({ date: r.day, scheduled: r.total, done: r.done }))
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
