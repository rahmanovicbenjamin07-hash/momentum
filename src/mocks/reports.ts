import type { GoalStatusRow } from '@/components/reports/GoalStatuses'
import type { Lesson } from '@/components/reports/Lessons'
import { monthReport, yearReport, type ReportInput } from '@/lib/reports'

/**
 * Mock data from design/reports.png (October 2026). The report itself is built with
 * src/lib/reports from these totals, the same way the page will.
 */

const october: ReportInput = {
  current: { tasksCompleted: 128, outreachSent: 96, replies: 18, meetings: 7, dealsWon: 1, dealsAmount: 1500, longestStreak: 12 },
  previous: { tasksCompleted: 119, outreachSent: 82, replies: 15, meetings: 5, dealsWon: 0, dealsAmount: 0, longestStreak: 10 },
  metrics: [
    { name: 'Money earned', unit: 'eur', value: 2200, previous: 1950, bestBefore: 1950 },
    { name: 'Trainings', unit: 'count', value: 13, previous: 15 },
    { name: 'Hours worked', unit: 'hours', value: 148, previous: 160 },
  ],
  routine: [
    { title: 'Wake up at 06:00', done: 20, scheduled: 20, previousDone: 21, previousScheduled: 22 },
    { title: 'Morning workout', done: 12, scheduled: 12, previousDone: 12, previousScheduled: 13 },
    { title: 'Send 10 outreach messages', done: 19, scheduled: 20, previousDone: 19, previousScheduled: 22 },
    { title: 'Plan today’s top 3', done: 28, scheduled: 30, previousDone: 27, previousScheduled: 30 },
    { title: 'Read 20 pages', done: 24, scheduled: 27, previousDone: 25, previousScheduled: 30 },
  ],
  bestReplyRateBefore: 0.16,
  dealNames: ['Café Rondo'],
}

const yearSoFar: ReportInput = {
  current: { tasksCompleted: 1184, outreachSent: 812, replies: 131, meetings: 44, dealsWon: 3, dealsAmount: 6300, longestStreak: 21 },
  previous: { tasksCompleted: 905, outreachSent: 540, replies: 70, meetings: 21, dealsWon: 1, dealsAmount: 1200, longestStreak: 14 },
  metrics: [
    { name: 'Money earned', unit: 'eur', value: 13950, previous: 8150 },
    { name: 'Trainings', unit: 'count', value: 117, previous: 78 },
    { name: 'Hours worked', unit: 'hours', value: 1371, previous: 1124 },
  ],
  routine: [
    { title: 'Wake up at 06:00', done: 182, scheduled: 215, previousDone: 150, previousScheduled: 215 },
    { title: 'Morning workout', done: 111, scheduled: 129, previousDone: 90, previousScheduled: 129 },
    { title: 'Send 10 outreach messages', done: 165, scheduled: 215, previousDone: 120, previousScheduled: 215 },
    { title: 'Plan today’s top 3', done: 249, scheduled: 301, previousDone: 230, previousScheduled: 301 },
    { title: 'Read 20 pages', done: 230, scheduled: 301, previousDone: 210, previousScheduled: 301 },
  ],
  dealNames: ['Fitbox Gym', 'Nova Dental', 'Café Rondo'],
}

export const mockMonthReport = monthReport('2026-10', october)
export const mockYearReport = yearReport(2026, yearSoFar)

export const mockGoalStatuses: GoalStatusRow[] = [
  { id: 'g-money', title: 'Earn €18,000 in 2026', status: 'on-track', label: 'On track with open deals' },
  { id: 'g-trainings', title: '150 trainings this year', status: 'behind' },
  { id: 'g-hours', title: 'Work 1,650 hours this year', status: 'on-track' },
  { id: 'g-wake', title: 'Wake up at 06:00 on 200 days', status: 'ahead' },
  { id: 'g-month', title: 'Earn €3,000 in a single month', status: 'ahead' },
]

export const mockLessons: Lesson[] = [
  { id: 'l-1', text: 'Mention one concrete detail from their website in the first line.' },
  { id: 'l-2', text: 'Phone in another room until 11:00 makes mornings far more productive.' },
]
