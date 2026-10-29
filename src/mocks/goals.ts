import type { GoalSource } from '@/components/goals/NewGoalDialog'
import type { DateKey } from '@/lib/dates'
import type { MonthValue } from '@/lib/forecast'
import type { GoalChip } from '@/components/goals/GoalChips'
import type { GoalStatus, PipelineDeal } from '@/components/goals/meta'

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

/** What a new goal can be measured on. Ids are valid UUIDs so the form accepts them. */
export const mockGoalSources: GoalSource[] = [
  { kind: 'metric', id: '00000000-0000-4000-8000-000000000001', name: 'Money earned', unit: 'eur' },
  { kind: 'metric', id: '00000000-0000-4000-8000-000000000002', name: 'Trainings', unit: 'count' },
  { kind: 'metric', id: '00000000-0000-4000-8000-000000000003', name: 'Hours worked', unit: 'hours' },
  { kind: 'routine', id: '00000000-0000-4000-8000-000000000004', name: 'Wake up at 06:00', unit: 'days' },
  { kind: 'routine', id: '00000000-0000-4000-8000-000000000005', name: 'Read 20 minutes', unit: 'days' },
]
