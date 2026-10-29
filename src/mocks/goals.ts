import type { DateKey } from '@/lib/dates'
import type { MonthValue } from '@/lib/forecast'
import type { GoalChip } from '@/components/goals/GoalChips'
import type { GoalStatus, PipelineDeal } from '@/components/goals/meta'
import type { GoalUpdate } from '@/schemas/goals'

/** The five goals from design/goals.png. Statuses are picked to show every dot colour. */
export const mockGoalChips: GoalChip[] = [
  { id: 'g-money', label: '€18k in 2026', status: 'ahead' },
  { id: 'g-trainings', label: '150 trainings', status: 'slightly_behind' },
  { id: 'g-hours', label: '1,650 hours', status: 'behind' },
  { id: 'g-mornings', label: '200 early mornings', status: 'on_track' },
  { id: 'g-month', label: '€3k month', status: 'reached' },
]

/** Open Outreach deals for the money goal: amount × stage probability = expected. */
export const mockPipelineDeals: PipelineDeal[] = [
  { id: 'd-nova', name: 'Nova Dental', stage: 'proposal', amount: 2400, probability: 0.5, expected: 1200 },
  { id: 'd-atelier', name: 'Atelier Sara', stage: 'meeting', amount: 1500, probability: 0.3, expected: 450 },
  { id: 'd-bloom', name: 'Bloom Studio', stage: 'replied', amount: 1200, probability: 0.15, expected: 180 },
  { id: 'd-brightline', name: 'Brightline Logistics', stage: 'contacted', amount: 900, probability: 0.05, expected: 45 },
  { id: 'd-mostar', name: 'Mostar Tours', stage: 'contacted', amount: 700, probability: 0.05, expected: 35 },
]

export const mockPipelineTotal = mockPipelineDeals.reduce((sum, d) => sum + d.expected, 0) // 1910

/** Header of the money goal, with and without the pipeline counted. */
export const mockMoneyGoalHeader: {
  sourceLine: string
  title: string
  progressText: string
  progressTextNoPipeline: string
  status: GoalStatus
} = {
  sourceLine: 'MY METRIC · Money earned · deadline 1 Jan 2027',
  title: 'Earn €18,000 in 2026',
  progressText: '€13,950 + €1,910 expected of €18,000',
  progressTextNoPipeline: '€13,950 of €18,000',
  status: 'ahead',
}

// ---------------------------------------------------------------------------
// Chart, pace slider, new-goal dialog
// ---------------------------------------------------------------------------

/** Mock "today" for the goal chart. */
export const MOCK_GOALS_TODAY: DateKey = '2026-10-28'

/** Money earned per month in 2026 (adds up to €13,950). */
export const mockMoneyGoalMonths: MonthValue[] = [
  { month: '2026-01', value: 600 },
  { month: '2026-02', value: 900 },
  { month: '2026-03', value: 1000 },
  { month: '2026-04', value: 950 },
  { month: '2026-05', value: 1200 },
  { month: '2026-06', value: 1300 },
  { month: '2026-07', value: 1400 },
  { month: '2026-08', value: 1500 },
  { month: '2026-09', value: 2200 },
  { month: '2026-10', value: 2900 },
]

/** The money goal's numbers that buildGoalChart needs (pace, pipeline and finish date are set by the demo). */
export const mockMoneyGoalChart = {
  startDate: '2026-01-01' as DateKey,
  deadline: '2027-01-01' as DateKey,
  target: 18000,
  realPace: 1950,
  pace: { min: 0, max: 4000, step: 50 },
}

/** Values typed in for a hand-updated goal ("Have €10,000 saved"), newest first. */
export const mockGoalUpdates: GoalUpdate[] = [
  { id: 'u-3', user_id: 'u', goal_id: 'g-saved', date: '2026-10-01', value: 5200, note: 'Salary + Nova Dental', created_at: '2026-10-01T18:00:00+00:00' },
  { id: 'u-2', user_id: 'u', goal_id: 'g-saved', date: '2026-08-01', value: 4300, note: null, created_at: '2026-08-01T18:00:00+00:00' },
  { id: 'u-1', user_id: 'u', goal_id: 'g-saved', date: '2026-06-01', value: 3600, note: 'First month', created_at: '2026-06-01T18:00:00+00:00' },
]
