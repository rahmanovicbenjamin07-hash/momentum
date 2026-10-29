import { useId } from 'react'
import { Badge } from '@/components/ui/badge'
import type { FixedNotificationKey, NotificationKey } from '@/schemas/settings'
import { comingLaterClass, sectionClass, settingsSectionId } from './meta'
import { SettingRow } from './SettingRow'
import { ToggleSwitch } from './ToggleSwitch'

type RowKey = Exclude<FixedNotificationKey, 'master' | 'quiet_hours'>

/** A routine reminder (title from the routine item) or one of the fixed reminders. */
export type NotificationRowData =
  | { key: `routine:${string}`; title: string; /** e.g. "Mon–Fri". */ daysLabel: string; enabled: boolean; time: string | null }
  | { key: RowKey; enabled: boolean; time: string | null }

export type QuietHours = { enabled: boolean; start: string | null; end: string | null }

/** What changed; only the fields that changed are set. */
export type NotificationChange = {
  key: NotificationKey
  enabled?: boolean
  time?: string | null
  time_end?: string | null
}

type NotificationsSettingsProps = {
  master: boolean
  /** Shown in this order; quiet hours always come last. */
  rows: NotificationRowData[]
  quietHours: QuietHours
  onChange: (change: NotificationChange) => void
}

const FIXED_TEXT: Record<RowKey, { title: string; subtitle: string }> = {
  anytime: { title: '“Anytime” routine items', subtitle: 'One reminder for items without a time' },
  followups: { title: 'Follow-ups due', subtitle: 'Contacts you should reply to today' },
  close_day: { title: 'Close the day', subtitle: 'Shows what’s left and moves it to tomorrow' },
  weekly_review: { title: 'Weekly review', subtitle: 'Every Sunday, with the week’s numbers filled in' },
  email_summary: { title: 'Morning email summary', subtitle: 'Today’s routine, tasks and follow-ups in your inbox' },
}

/** Not built yet: always shown off and disabled. */
const COMING_LATER: ReadonlySet<NotificationKey> = new Set<NotificationKey>(['email_summary'])

/** "Notifications" card: master switch on top, then one row per reminder, then quiet hours. */
export function NotificationsSettings({ master, rows, quietHours, onChange }: NotificationsSettingsProps) {
  const id = useId()
  const off = !master

  return (
    <section
      id={settingsSectionId('notifications')}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      className={sectionClass}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-lg font-semibold text-foreground">
            Notifications
          </h2>
          <p id={`${id}-subtitle`} className="text-[13px] text-ink-2">
            Push notifications on this phone · works when Momentum is installed on your home screen
          </p>
        </div>
        <ToggleSwitch
          checked={master}
          onCheckedChange={(enabled) => onChange({ key: 'master', enabled })}
          aria-label="Push notifications"
          aria-describedby={`${id}-subtitle`}
        />
      </div>

      <ul className="divide-y divide-border border-t border-border">
        {rows.map((row) => {
          const text = 'title' in row ? { title: row.title, subtitle: `Routine reminder · ${row.daysLabel}` } : FIXED_TEXT[row.key]
          const later = COMING_LATER.has(row.key)
          return (
            <li key={row.key}>
              <SettingRow
                title={text.title}
                subtitle={text.subtitle}
                time={row.time}
                onTimeChange={(time) => onChange({ key: row.key, time })}
                enabled={later ? false : row.enabled}
                onToggle={(enabled) => onChange({ key: row.key, enabled })}
                disabled={off || later}
                badge={later ? <Badge className={comingLaterClass}>Coming later</Badge> : undefined}
              />
            </li>
          )
        })}
        <li>
          <SettingRow
            title="Quiet hours"
            subtitle="No notifications in this window"
            time={quietHours.start}
            onTimeChange={(time) => onChange({ key: 'quiet_hours', time })}
            timeEnd={quietHours.end}
            onTimeEndChange={(time_end) => onChange({ key: 'quiet_hours', time_end })}
            enabled={quietHours.enabled}
            onToggle={(enabled) => onChange({ key: 'quiet_hours', enabled })}
            disabled={off}
          />
        </li>
      </ul>
    </section>
  )
}
