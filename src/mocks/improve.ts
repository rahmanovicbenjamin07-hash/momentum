import type { DateKey } from '@/lib/dates'
import type { Experiment, Idea, Lesson, Review } from '@/schemas/improve'

/** Mock "today" for the Improvements page: Wednesday 28 Oct 2026 (week 44). */
export const MOCK_IMPROVE_TODAY: DateKey = '2026-10-28'

const USER_ID = '00000000-0000-4000-8000-000000000001'
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

/** Week 43 review, still a draft (design/improve.png). */
export const mockReviewWeekLabel = 'Week 43 · 19–25 Oct'
export const mockReview: Review = {
  id: id(101),
  user_id: USER_ID,
  created_at: '2026-10-25T19:30:00+00:00',
  week_start: '2026-10-19',
  wins: 'Booked 2 meetings. Kept the streak alive through a packed Thursday.',
  misses: 'Email openers to logistics companies got no replies (0 of 9).',
  lesson: 'Naming one specific thing from their website beats a generic compliment.',
  focus: 'Send follow-ups on day 3 instead of day 7.',
  status: 'draft',
  stats_snapshot: { task_completion: 81, outreach_sent: 24, replies: 5, meetings: 2 },
}

export const mockPastReviews = [
  { weekLabel: 'Week 42 · 12–18 Oct', completion: 76, focus: 'plan top 3 the night before' },
  { weekLabel: 'Week 41 · 5–11 Oct', completion: 72, focus: '20 outreaches' },
  { weekLabel: 'Week 40 · 28 Sep–4 Oct', completion: 69, focus: 'no phone before 11:00' },
] as const

export const mockRunningExperiment = {
  title: 'Follow up on day 3 instead of day 7',
  day: 10,
  totalDays: 14,
  beforeLabel: 'Reply rate before',
  before: '14.2%',
  during: '21.0%',
  better: true,
  note: '31 follow-ups sent so far — enough to start trusting the difference.',
}

export const mockWeeklyGoals = [
  { label: '20 outreaches', valueText: '11 / 20', pct: 55, onTrack: false },
  { label: '80% task completion', valueText: '83%', pct: 100, onTrack: true },
  { label: '2 meetings booked', valueText: '1 / 2', pct: 50, onTrack: false },
] as const

export const mockImproveLessons: Lesson[] = [
  {
    id: id(201),
    user_id: USER_ID,
    created_at: '2026-10-25T19:35:00+00:00',
    area: 'Outreach',
    text: 'Naming one specific thing from their website beats a generic compliment.',
  },
  {
    id: id(202),
    user_id: USER_ID,
    created_at: '2026-10-25T19:36:00+00:00',
    area: 'Outreach',
    text: 'Logistics companies ignore cold email; try LinkedIn or a call instead.',
  },
  {
    id: id(203),
    user_id: USER_ID,
    created_at: '2026-10-18T20:10:00+00:00',
    area: 'Routine',
    text: 'Planning the top 3 the night before makes mornings start faster.',
  },
  {
    id: id(204),
    user_id: USER_ID,
    created_at: '2026-10-11T18:50:00+00:00',
    area: 'Work',
    text: 'Batching client emails into one block saves about an hour a day.',
  },
  {
    id: id(205),
    user_id: USER_ID,
    created_at: '2026-10-04T19:05:00+00:00',
    area: 'Health',
    text: 'No phone before 11:00 keeps the first work block focused.',
  },
]

export const mockExperiments: Experiment[] = [
  {
    id: id(301),
    user_id: USER_ID,
    created_at: '2026-10-19T07:00:00+00:00',
    title: 'Follow up on day 3 instead of day 7',
    hypothesis: 'Earlier follow-ups get more replies because the first message is still fresh.',
    metric: 'reply_rate',
    start_date: '2026-10-19',
    end_date: '2026-11-01',
    status: 'running',
    before_value: 14.2,
    during_value: 21.0,
    result: '',
  },
  {
    id: id(302),
    user_id: USER_ID,
    created_at: '2026-09-28T07:00:00+00:00',
    title: 'Plan the top 3 tasks the night before',
    hypothesis: 'Knowing the first task in the morning means less time lost deciding.',
    metric: 'task_completion',
    start_date: '2026-09-28',
    end_date: '2026-10-11',
    status: 'kept',
    before_value: 69,
    during_value: 76,
    result: 'Completion went up and mornings felt calmer.',
  },
  {
    id: id(303),
    user_id: USER_ID,
    created_at: '2026-09-14T07:00:00+00:00',
    title: 'Send outreach at 07:00 instead of 10:00',
    hypothesis: 'Emails at the top of the inbox get read first.',
    metric: 'reply_rate',
    start_date: '2026-09-14',
    end_date: '2026-09-27',
    status: 'dropped',
    before_value: 13.8,
    during_value: 11.5,
    result: 'Fewer replies; early emails got buried.',
  },
]

export const mockIdeas: Idea[] = [
  {
    id: id(401),
    user_id: USER_ID,
    created_at: '2026-10-26T09:00:00+00:00',
    text: 'Record a 30-second video for warm leads',
    status: 'new',
  },
  {
    id: id(402),
    user_id: USER_ID,
    created_at: '2026-10-22T09:00:00+00:00',
    text: 'Ask happy clients for one referral each',
    status: 'new',
  },
  {
    id: id(403),
    user_id: USER_ID,
    created_at: '2026-10-18T09:00:00+00:00',
    text: 'Follow up on day 3 instead of day 7',
    status: 'testing',
  },
  {
    id: id(404),
    user_id: USER_ID,
    created_at: '2026-10-02T09:00:00+00:00',
    text: 'Post on LinkedIn every day',
    status: 'dropped',
  },
]
