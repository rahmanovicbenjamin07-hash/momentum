import type { NotificationRowData, QuietHours } from '@/components/settings/NotificationsSettings'
import type { Backup } from '@/components/settings/DataSettings'
import type { DayEndHour, Theme, WeekStart } from '@/schemas/settings'

/** Routine item ids (fake uuids) for the routine reminder rows. */
const routineKey = (n: number) => `routine:00000000-0000-4000-8000-${String(n).padStart(12, '0')}` as const

export const mockNotificationMaster = true

/** design/settings.png, top to bottom (quiet hours are separate). */
export const mockNotificationRows: NotificationRowData[] = [
  { key: routineKey(501), title: 'Wake up', daysLabel: 'Mon–Fri', enabled: true, time: '06:00' },
  { key: routineKey(502), title: 'Morning workout', daysLabel: 'Mon, Wed, Fri', enabled: true, time: '06:30' },
  { key: routineKey(503), title: 'Read 20 pages', daysLabel: 'every day', enabled: true, time: '21:30' },
  { key: 'anytime', enabled: true, time: '09:00' },
  { key: 'followups', enabled: true, time: '09:00' },
  { key: 'close_day', enabled: true, time: '21:00' },
  { key: 'weekly_review', enabled: true, time: '18:00' },
  { key: 'email_summary', enabled: false, time: '07:00' },
]

export const mockQuietHours: QuietHours = { enabled: true, start: '22:00', end: '06:00' }

export const mockAppearance: { theme: Theme; weekStart: WeekStart; dayEndHour: DayEndHour; language: 'en' } = {
  theme: 'light',
  weekStart: 1,
  dayEndHour: 0,
  language: 'en',
}

export const mockBackupEnabled = true

export const mockBackups: Backup[] = [
  { path: 'backups/2026-10-28.json.gz', label: 'Today, 03:00', size: '2.1 MB' },
  { path: 'backups/2026-10-27.json.gz', label: 'Yesterday, 03:00', size: '2.1 MB' },
  { path: 'backups/2026-10-26.json.gz', label: 'Mon 26 Oct, 03:00', size: '2.0 MB' },
]
