import { useId } from 'react'
import { cn } from 'cn'
import { Label } from '@/components/ui/label'
import type { DayEndHour, ProfileSettings, WeekStart } from '@/schemas/settings'
import { sectionClass, selectClass, settingsSectionId } from './meta'

type DateTimeChange = Partial<Pick<ProfileSettings, 'week_start' | 'day_end_hour' | 'language'>>

type DateTimeSettingsProps = {
  weekStart: WeekStart
  dayEndHour: DayEndHour
  language: ProfileSettings['language']
  /** Only the changed field is set. */
  onChange: (change: DateTimeChange) => void
}

const DAY_END_OPTIONS: { value: DayEndHour; label: string }[] = [
  { value: 0, label: '00:00 (midnight)' },
  { value: 2, label: '02:00' },
  { value: 4, label: '04:00' },
]

/** "Date & time" card: when the week starts, when the day ends, and the language. */
export function DateTimeSettings({ weekStart, dayEndHour, language, onChange }: DateTimeSettingsProps) {
  const id = useId()

  return (
    <section
      id={settingsSectionId('datetime')}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      className={cn(sectionClass, 'p-5')}
    >
      <h2 id={`${id}-title`} className="text-lg font-semibold text-foreground">
        Date &amp; time
      </h2>
      <p className="text-[13px] text-ink-2">How Momentum counts your days and weeks</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-week`}>Week starts on</Label>
          <select
            id={`${id}-week`}
            className={selectClass}
            value={weekStart}
            onChange={(e) => onChange({ week_start: e.target.value === '0' ? 0 : 1 })}
          >
            <option value={1}>Monday</option>
            <option value={0}>Sunday</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-day-end`}>My day ends at (for late nights)</Label>
          <select
            id={`${id}-day-end`}
            className={selectClass}
            value={dayEndHour}
            onChange={(e) => {
              const picked = DAY_END_OPTIONS.find((o) => String(o.value) === e.target.value)
              if (picked) onChange({ day_end_hour: picked.value })
            }}
          >
            {DAY_END_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-language`}>Language</Label>
          <select
            id={`${id}-language`}
            className={selectClass}
            value={language}
            onChange={() => onChange({ language: 'en' })}
          >
            <option value="en">English</option>
          </select>
        </div>
      </div>
    </section>
  )
}
