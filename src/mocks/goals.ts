import type { DateKey } from '@/lib/dates'
import type { MonthValue } from '@/lib/forecast'
import type { GoalChip } from '@/components/goals/GoalChips'
import type { GoalStatus, PipelineDeal } from '@/components/goals/meta'
import type { HabitDay, HabitWeekCell } from '@/components/goals/HabitTracker'
import type { MilestoneItem } from '@/components/goals/MilestoneList'
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
  title: string
  progressText: string
  progressTextNoPipeline: string
  status: GoalStatus
} = {
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

// ---------------------------------------------------------------------------
// Objective + key results of every kind
// ---------------------------------------------------------------------------

/** Steps of "Launch the new website" (one overdue on MOCK_GOALS_TODAY). */
export const mockMilestones: MilestoneItem[] = [
  { id: 'm-1', title: 'Buy the domain', due_date: '2026-10-05', done_on: '2026-10-03' },
  { id: 'm-2', title: 'Design the homepage', due_date: '2026-10-20', done_on: null },
  { id: 'm-3', title: 'Write the copy', due_date: '2026-11-15', done_on: null },
  { id: 'm-4', title: 'Go live', due_date: null, done_on: null },
]

/** "Gym 3× a week" since 7 Sep 2026: 7 weeks done, one missed; this week 1 of 3 so far. */
export const mockHabitWeeks: HabitWeekCell[] = [
  { start: '2026-09-07', count: 3, needed: 3, hit: true, current: false },
  { start: '2026-09-14', count: 4, needed: 3, hit: true, current: false },
  { start: '2026-09-21', count: 1, needed: 3, hit: false, current: false },
  { start: '2026-09-28', count: 3, needed: 3, hit: true, current: false },
  { start: '2026-10-05', count: 3, needed: 3, hit: true, current: false },
  { start: '2026-10-12', count: 3, needed: 3, hit: true, current: false },
  { start: '2026-10-19', count: 5, needed: 3, hit: true, current: false },
  { start: '2026-10-26', count: 1, needed: 3, hit: false, current: true },
]

/** This week (Mon 26 Oct – Sun 1 Nov) on Wednesday 28 Oct: Monday ticked. */
export const mockHabitDays: HabitDay[] = [
  { date: '2026-10-26', weekday: 'Mon', done: true, disabled: false },
  { date: '2026-10-27', weekday: 'Tue', done: false, disabled: false },
  { date: '2026-10-28', weekday: 'Wed', done: false, disabled: false },
  { date: '2026-10-29', weekday: 'Thu', done: false, disabled: true },
  { date: '2026-10-30', weekday: 'Fri', done: false, disabled: true },
  { date: '2026-10-31', weekday: 'Sat', done: false, disabled: true },
  { date: '2026-11-01', weekday: 'Sun', done: false, disabled: true },
]

/** The objective with one key result of each kind. */
export const mockObjective = {
  line: '4 KEY RESULTS · BY 31 MAR 2027',
  title: 'Become a fully booked freelancer',
  why: 'So I can pick my clients and stop worrying about next month.',
  percent: 46,
  status: 'slightly_behind' as GoalStatus,
}
