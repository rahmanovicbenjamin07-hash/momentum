import type { NotificationItem } from '@/components/notifications/NotificationsPanel'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

/** The bell panel in design/today-notifications.png (today = Wed 28 Oct 2026). */
export const mockNotifications: NotificationItem[] = [
  {
    id: id(601),
    kind: 'followup_due',
    title: 'Follow up with Emir Kovač',
    body: 'Due today · LinkedIn',
    link: '/outreach/00000000-0000-4000-8000-000000000011',
    read_at: null,
    timeLabel: '09:00',
  },
  {
    id: id(602),
    kind: 'followup_late',
    title: 'Marko Petrović is 2 days late',
    body: 'Follow-up overdue · Email',
    link: '/outreach/00000000-0000-4000-8000-000000000012',
    read_at: null,
    timeLabel: '09:00',
  },
  {
    id: id(603),
    kind: 'routine',
    title: 'Wake up',
    body: 'Routine reminder · done',
    link: '/',
    read_at: '2026-10-28T05:10:00+00:00',
    timeLabel: '06:00',
  },
  {
    id: id(604),
    kind: 'close_day',
    title: 'Close the day',
    body: '2 tasks left — moved to today',
    link: '/',
    read_at: '2026-10-27T20:30:00+00:00',
    timeLabel: 'Yesterday',
  },
  {
    id: id(605),
    kind: 'weekly_review',
    title: 'Weekly review is ready',
    body: 'Week 43 numbers are filled in',
    link: '/improvements',
    read_at: '2026-10-25T18:30:00+00:00',
    timeLabel: 'Sun',
  },
]
