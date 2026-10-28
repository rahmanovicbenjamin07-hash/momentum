import type { WeekProgress } from '@/lib/progress'
import type { RoutineItem, Task, TodayItem } from '@/schemas/today'

/** Mock data from design/today.png and design/today-edit-repeating.png (Wednesday 28 Oct 2026). */

const MOCK_USER_ID = '0b7e8c1d-2f3a-4b5c-9d6e-7f8091a2b3c4'
const CREATED_AT = '2026-10-01T08:00:00+00:00'

/** Fixed, valid UUIDs so React keys and tests stay stable. */
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const MON_FRI = [true, true, true, true, true, false, false]
const EVERY_DAY = [true, true, true, true, true, true, true]
const MON_WED_FRI = [true, false, true, false, true, false, false]
const SAT = [false, false, false, false, false, true, false]
const SUN = [false, false, false, false, false, false, true]

function routine(n: number, title: string, days: boolean[], time: string | null): RoutineItem {
  return {
    id: uuid(n),
    user_id: MOCK_USER_ID,
    created_at: CREATED_AT,
    title,
    days,
    time,
    position: n - 1,
    active: true,
  }
}

/** All routine items, in their saved order (what "Edit repeating" shows). */
export const mockRoutineItems: RoutineItem[] = [
  routine(1, 'Wake up', MON_FRI, '06:00:00'),
  routine(2, 'Morning workout', MON_WED_FRI, '06:30:00'),
  routine(3, 'Plan today’s top 3 tasks', EVERY_DAY, null),
  routine(4, 'Send 10 outreach messages', MON_FRI, null),
  routine(5, 'Read 20 pages', EVERY_DAY, '21:30:00'),
  routine(6, 'Long run', SAT, '08:00:00'),
  routine(7, 'Weekly review', SUN, '18:00:00'),
]

/** Today's list: 5 routine items scheduled on Wednesday + 6 one-off tasks. 5 of 11 done. */
export const mockTodayItems: TodayItem[] = [
  { kind: 'routine', id: uuid(1), title: 'Wake up', time: '06:00', done: true, days: MON_FRI },
  { kind: 'routine', id: uuid(2), title: 'Morning workout', time: '06:30', done: true, days: MON_WED_FRI },
  { kind: 'routine', id: uuid(3), title: 'Plan today’s top 3 tasks', time: null, done: true, days: EVERY_DAY },
  { kind: 'routine', id: uuid(4), title: 'Send 10 outreach messages', time: null, done: false, days: MON_FRI },
  { kind: 'routine', id: uuid(5), title: 'Read 20 pages', time: '21:30', done: false, days: EVERY_DAY },
  {
    kind: 'task',
    id: uuid(101),
    title: 'Follow up with Emir Kovač (Bloom Studio)',
    time: '10:30',
    done: false,
    tag: 'outreach',
    priority: 'high',
  },
  { kind: 'task', id: uuid(102), title: 'Prepare demo for Thursday call', time: '14:00', done: false, tag: 'work', priority: 'high' },
  {
    kind: 'task',
    id: uuid(103),
    title: 'Call accountant about October invoice',
    time: null,
    done: false,
    tag: 'personal',
    priority: 'low',
  },
  { kind: 'task', id: uuid(104), title: 'Review Q4 goals', time: null, done: false, tag: 'personal', priority: 'low' },
  {
    kind: 'task',
    id: uuid(105),
    title: 'Plan weekly content calendar',
    time: null,
    done: true,
    tag: 'marketing',
    priority: 'medium',
  },
  { kind: 'task', id: uuid(106), title: 'Update portfolio case study', time: null, done: true, tag: 'work', priority: 'medium' },
]

/** "Yesterday you missed Read 20 pages" (design: yesterday was the weekly rest day, so the streak is safe). */
export const mockMissedYesterday: RoutineItem[] = mockRoutineItems.filter((r) => r.title === 'Read 20 pages')

/** Overdue block: one unfinished task from yesterday. */
export const mockOverdueTasks: Task[] = [
  {
    id: uuid(201),
    user_id: MOCK_USER_ID,
    created_at: CREATED_AT,
    title: 'Send proposal to Lejla Hodžić',
    notes: null,
    due_date: '2026-10-27',
    time: null,
    tag: 'outreach',
    priority: 'high',
    status: 'todo',
    completed_at: null,
    position: 0,
    contact_id: null,
  },
]

/** The day the mocks describe. */
export const MOCK_TODAY = '2026-10-28'

/** "This week" card (design: Mon 86%, Tue 92%, Wed 45% → 76%; Tasks 17/24, Repeating 12/14). */
export const mockWeekProgress: WeekProgress = {
  days: [
    { date: '2026-10-26', done: 12, total: 14, percent: 86, isToday: false, isFuture: false },
    { date: '2026-10-27', done: 12, total: 13, percent: 92, isToday: false, isFuture: false },
    { date: '2026-10-28', done: 5, total: 11, percent: 45, isToday: true, isFuture: false },
    { date: '2026-10-29', done: 0, total: 0, percent: null, isToday: false, isFuture: true },
    { date: '2026-10-30', done: 0, total: 0, percent: null, isToday: false, isFuture: true },
    { date: '2026-10-31', done: 0, total: 0, percent: null, isToday: false, isFuture: true },
    { date: '2026-11-01', done: 0, total: 0, percent: null, isToday: false, isFuture: true },
  ],
  all: { done: 29, total: 38 },
  routine: { done: 12, total: 14 },
  oneOff: { done: 17, total: 24 },
  percent: 76,
}

/** "Outreaches this week": 11 of 20, 3 replies. */
export const mockOutreachWeek = { sent: 11, goal: 20, replies: 3 }

/** Daily note: empty note, energy 4 (as in the design). */
export const mockDailyLog = { note: '', energy: 4 }
