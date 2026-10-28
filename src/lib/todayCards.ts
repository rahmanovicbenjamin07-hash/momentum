import type { WeekDayProgress } from './progress'
import type { StreakTier } from './streak'
import { WEEKDAY_SHORT } from './today-list'

/** "1 day", "12 days". */
export function daysLabel(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`
}

/** Line under the streak bar: "12 days to Blaze", "Next milestone: 150 days", or a nudge at 0. */
export function streakCaption(days: number, tier: StreakTier): string {
  if (days <= 0) return 'Finish today’s routine to start one'
  if (tier.nextLevel.isMilestone) return `Next milestone: ${tier.nextLevel.atDays} days`
  return `${daysLabel(tier.daysToNext)} to ${tier.nextLevel.name}`
}

/** "3 replies so far · 9 more to hit your goal" (or "· goal reached"). */
export function outreachCaption(sent: number, goal: number, replies: number): string {
  const replyText = replies === 0 ? 'No replies yet' : `${replies} ${replies === 1 ? 'reply' : 'replies'} so far`
  const left = goal - sent
  return `${replyText} · ${left > 0 ? `${left} more to hit your goal` : 'goal reached'}`
}

/** Whole percent of a goal, capped at 100 (for bars). */
export function goalPercent(value: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((value / goal) * 100)))
}

/** "Mon–Wed": Monday up to today (just "Mon" on Mondays). */
export function weekSoFarLabel(days: readonly WeekDayProgress[]): string {
  const todayIndex = days.findIndex((d) => d.isToday)
  const last = todayIndex === -1 ? days.length - 1 : todayIndex
  return last <= 0 ? 'Mon' : `Mon–${WEEKDAY_SHORT[last] ?? 'Sun'}`
}

/** Colour step for a day in the 7-day strip: darker means more done. */
export type WeekCellTone = 'empty' | 'low' | 'mid' | 'high' | 'top'

export function weekCellTone(percent: number | null): WeekCellTone {
  if (percent === null) return 'empty'
  if (percent >= 90) return 'top'
  if (percent >= 70) return 'high'
  if (percent >= 40) return 'mid'
  return 'low'
}
