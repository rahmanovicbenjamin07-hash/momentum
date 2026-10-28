/** Streak levels and their flame colours (docs/phase-1-today.md → streak table). */

export type StreakLevelId = 'start' | 'spark' | 'flame' | 'blaze' | 'inferno' | 'legend'

export type StreakLevel = {
  id: StreakLevelId
  name: string
  /** Lowest streak (in days) that reaches this level. */
  minDays: number
  colors: {
    outer: string
    middle: string
    core: string
    /** Background of the circle behind the flame. */
    tint: string
  }
  /** Darker shade of the level colour that passes WCAG AA as text on white and on the `core` colour (badges, labels). */
  textColor: string
  /** Top levels get little sparkles around the circle. */
  sparkles: boolean
}

/** Ordered from lowest to highest. */
export const STREAK_LEVELS: readonly StreakLevel[] = [
  {
    id: 'start',
    name: 'Start',
    minDays: 0,
    colors: { outer: '#9CA3AF', middle: '#D1D5DB', core: '#F3F4F6', tint: '#F3F4F6' },
    textColor: '#374151',
    sparkles: false,
  },
  {
    id: 'spark',
    name: 'Spark',
    minDays: 1,
    colors: { outer: '#F59E0B', middle: '#FBBF24', core: '#FEF3C7', tint: '#FFFBEB' },
    textColor: '#92400E',
    sparkles: false,
  },
  {
    id: 'flame',
    name: 'Flame',
    minDays: 10,
    colors: { outer: '#F97316', middle: '#FB923C', core: '#FED7AA', tint: '#FFF7ED' },
    textColor: '#9A3412',
    sparkles: false,
  },
  {
    id: 'blaze',
    name: 'Blaze',
    minDays: 30,
    colors: { outer: '#E11D48', middle: '#FB7185', core: '#FFE4E6', tint: '#FFF1F2' },
    textColor: '#BE123C',
    sparkles: false,
  },
  {
    id: 'inferno',
    name: 'Inferno',
    minDays: 60,
    colors: { outer: '#9333EA', middle: '#C084FC', core: '#F3E8FF', tint: '#FAF5FF' },
    textColor: '#7E22CE',
    sparkles: true,
  },
  {
    id: 'legend',
    name: 'Legend',
    minDays: 100,
    colors: { outer: '#2563EB', middle: '#60A5FA', core: '#DBEAFE', tint: '#EFF6FF' },
    textColor: '#1D4ED8',
    sparkles: true,
  },
]

export function getStreakLevel(id: StreakLevelId): StreakLevel {
  const level = STREAK_LEVELS.find((l) => l.id === id)
  if (!level) throw new Error(`Unknown streak level: ${id}`)
  return level
}

/** The level a streak of `days` has reached. Negative or broken input counts as 0. */
export function streakLevelForDays(days: number): StreakLevel {
  const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 0
  // Highest level whose minimum we've reached; 'start' (0 days) always matches.
  return STREAK_LEVELS.findLast((l) => safeDays >= l.minDays) ?? getStreakLevel('start')
}
