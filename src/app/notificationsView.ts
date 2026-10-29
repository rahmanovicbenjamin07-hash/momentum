import type { NotificationItem } from '@/components/notifications/NotificationsPanel'
import { addDays, daysBetween, formatDate, toDateKey } from '@/lib/dates'
import type { Notification } from '@/schemas/settings'

/** When a notification arrived: "09:00" today, "Yesterday", "Sun" this past week, else "21 Oct 2026". */
export function notificationTimeLabel(createdAt: string, now: Date, timeZone: string): string {
  const at = new Date(createdAt)
  const day = toDateKey(at, timeZone)
  const today = toDateKey(now, timeZone)
  if (day === today) {
    return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at)
  }
  if (day === addDays(today, -1)) return 'Yesterday'
  if (daysBetween(day, today) < 7) return new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short' }).format(at)
  return formatDate(at, timeZone)
}

export function toNotificationItems(rows: readonly Notification[], now: Date, timeZone: string): NotificationItem[] {
  return rows.map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    link: n.link,
    read_at: n.read_at,
    timeLabel: notificationTimeLabel(n.created_at, now, timeZone),
  }))
}
