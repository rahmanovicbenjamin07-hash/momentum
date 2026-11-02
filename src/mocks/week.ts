import type { DateKey } from '@/lib/dates'
import { weekColumns, type WeekColumn } from '@/lib/week'

/** Week view sample: Wed 4 Nov 2026 is today, so Mon–Tue are past and Thu–Sun still to come. */
export const MOCK_WEEK_TODAY: DateKey = '2026-11-04'
export const MOCK_WEEK_FIRST: DateKey = '2026-11-02'

const WEEKDAYS = [true, true, true, true, true, false, false]

export const mockWeekColumns: WeekColumn[] = weekColumns({
  day: MOCK_WEEK_FIRST,
  today: MOCK_WEEK_TODAY,
  routineItems: [
    { id: 'wake', title: 'Wake up at 06:00', days: WEEKDAYS, time: '06:00:00', active: true },
    { id: 'outreach', title: 'Send 10 outreach messages', days: WEEKDAYS, time: null, active: true },
  ],
  checks: [
    { routine_item_id: 'wake', date: '2026-11-02', done: true },
    { routine_item_id: 'outreach', date: '2026-11-02', done: true },
    { routine_item_id: 'wake', date: '2026-11-03', done: true },
    { routine_item_id: 'wake', date: '2026-11-04', done: true },
  ],
  tasks: [
    { id: 't1', title: 'Call Ana about the website', time: '10:30:00', due_date: '2026-11-02', status: 'done', tag: 'outreach', priority: 'high' },
    { id: 't2', title: 'Send invoice', time: null, due_date: '2026-11-03', status: 'todo', tag: 'work', priority: 'medium' },
    { id: 't3', title: 'Update portfolio', time: null, due_date: '2026-11-04', status: 'todo', tag: 'work', priority: 'low' },
    { id: 't4', title: 'Dentist', time: '14:00:00', due_date: '2026-11-05', status: 'todo', tag: null, priority: 'medium' },
    { id: 't5', title: 'Plan next week', time: null, due_date: '2026-11-08', status: 'todo', tag: null, priority: 'low' },
  ],
})
