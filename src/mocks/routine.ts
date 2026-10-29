import type { RoutineCardData } from '@/components/routine/RoutineItemCards'
import type { MonthKey } from '@/lib/metrics'
import type { RoutineItemStats, RoutineMonth } from '@/lib/routineStats'

/** Mock data from design/progress-routine.png ("Wake up at 06:00", Mon–Fri, 2026 up to October). */

export const MOCK_ROUTINE_YEAR = 2026
export const MOCK_ROUTINE_MONTH: MonthKey = '2026-10'

const MON_FRI = [true, true, true, true, true, false, false]
const EVERY_DAY = [true, true, true, true, true, true, true]

export const mockRoutineCards: RoutineCardData[] = [
  { id: 'r-wake', title: 'Wake up at 06:00', days: MON_FRI, done: 182, missed: 33, rate: 0.85 },
  { id: 'r-workout', title: 'Morning workout', days: [true, false, true, false, true, false, false], done: 111, missed: 18, rate: 0.86 },
  { id: 'r-plan', title: 'Plan today’s top 3', days: EVERY_DAY, done: 249, missed: 52, rate: 0.83 },
  { id: 'r-outreach', title: 'Send 10 outreach messages', days: MON_FRI, done: 165, missed: 50, rate: 0.77 },
  { id: 'r-read', title: 'Read 20 pages', days: EVERY_DAY, done: 230, missed: 71, rate: 0.76 },
]

/** [done, scheduled] per month, January → October (the design's month table). */
const DONE_OF: [number, number][] = [
  [16, 22],
  [17, 20],
  [19, 22],
  [18, 22],
  [20, 21],
  [19, 22],
  [14, 23],
  [18, 21],
  [21, 22],
  [20, 20],
]
/** Weekdays in November and December 2026, for the perfect-year line. */
const REST_OF_YEAR = [21, 23]

const key = (m: number): MonthKey => `${MOCK_ROUTINE_YEAR}-${String(m).padStart(2, '0')}`

let total = 0
let perfectTotal = 0
export const mockRoutineMonths: RoutineMonth[] = DONE_OF.map(([done, scheduled], i) => {
  total += done
  perfectTotal += scheduled
  return { month: key(i + 1), scheduled, done, missed: scheduled - done, rate: done / scheduled, total, perfectTotal }
})

const perfectLine: { month: MonthKey; total: number }[] = [
  ...mockRoutineMonths.map((m) => ({ month: m.month, total: m.perfectTotal })),
  { month: key(11), total: perfectTotal + REST_OF_YEAR[0]! },
  { month: key(12), total: perfectTotal + REST_OF_YEAR[0]! + REST_OF_YEAR[1]! },
]

export const mockWakeUpStats: RoutineItemStats = {
  done: 182,
  scheduled: 215,
  missed: 33,
  rate: 182 / 215,
  months: mockRoutineMonths,
  perfectYear: 259,
  perfectLine,
  trend: 'improving',
  bestMonth: mockRoutineMonths[9]!,
  forecast: {
    total: 221,
    pace: 0.89,
    line: [
      { month: key(10), total: 182 },
      { month: key(11), total: 200.7 },
      { month: key(12), total: 221 },
    ],
  },
  thisMonth: { done: 20, scheduled: 20 },
  missReasons: [
    { reason: 'Tired', count: 15 },
    { reason: 'Sick', count: 4 },
    { reason: 'Travel', count: 4 },
    { reason: 'Other', count: 2 },
    { reason: 'Not answered', count: 8 },
  ],
  missWeekday: { weekday: 0, misses: 12, sentence: 'Most misses are on Mondays — usually after a late Sunday.' },
}
