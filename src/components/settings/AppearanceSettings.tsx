import { useId } from 'react'
import { cn } from 'cn'
import { Label } from '@/components/ui/label'
import type { DayEndHour, ProfileSettings, Theme, WeekStart } from '@/schemas/settings'
import { sectionClass, selectClass, settingsSectionId } from './meta'

type AppearanceChange = Partial<Pick<ProfileSettings, 'theme' | 'week_start' | 'day_end_hour' | 'language'>>

type AppearanceSettingsProps = {
  theme: Theme
  weekStart: WeekStart
  dayEndHour: DayEndHour
  language: ProfileSettings['language']
  /** Only the changed field is set. */
  onChange: (change: AppearanceChange) => void
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match my device' },
]

const DAY_END_OPTIONS: { value: DayEndHour; label: string }[] = [
  { value: 0, label: '00:00 (midnight)' },
  { value: 2, label: '02:00' },
  { value: 4, label: '04:00' },
]

/**
 * Fixed colours on purpose: each preview must show its own theme whatever theme is active
 * (the Light card stays light in dark mode and the other way round).
 */
const PREVIEW = {
  light: { side: '#FFFFFF', page: '#F4F5F7', bar: '#E5E7EB', card: '#FFFFFF' },
  dark: { side: '#111827', page: '#0B0F17', bar: '#263041', card: '#151B26' },
  system: { side: '#111827', page: '#F4F5F7', bar: '#C7D2FE', card: '#FFFFFF' },
} as const

/** Small drawing of the app in each theme: sidebar on the left, header bar and a card on the right. */
function ThemePreview({ theme }: { theme: Theme }) {
  const c = PREVIEW[theme]
  return (
    <div aria-hidden="true" className="flex h-[76px] overflow-hidden rounded-lg border border-border">
      <div className="w-[30%]" style={{ background: c.side }} />
      <div className="flex flex-1 flex-col gap-2 p-2" style={{ background: c.page }}>
        <div className="h-2 w-1/2 rounded-sm" style={{ background: c.bar }} />
        <div className="flex-1 rounded-sm" style={{ background: c.card }} />
      </div>
    </div>
  )
}

/** "Appearance" card: theme picker (radio cards) and three selects. */
export function AppearanceSettings({ theme, weekStart, dayEndHour, language, onChange }: AppearanceSettingsProps) {
  const id = useId()

  return (
    <section
      id={settingsSectionId('appearance')}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      className={cn(sectionClass, 'p-5')}
    >
      <h2 id={`${id}-title`} className="text-lg font-semibold text-foreground">
        Appearance
      </h2>
      <p className="text-[13px] text-ink-2">Pick Dark to see this page switch</p>

      <fieldset className="mt-4">
        <legend className="sr-only">Theme</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map((option) => {
            const checked = theme === option.value
            return (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer flex-col gap-2.5 rounded-xl border-2 p-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                  checked ? 'border-brand' : 'border-border hover:border-ink-3',
                )}
              >
                <input
                  type="radio"
                  name={`${id}-theme`}
                  value={option.value}
                  checked={checked}
                  onChange={() => onChange({ theme: option.value })}
                  className="sr-only"
                />
                <ThemePreview theme={option.value} />
                <span className="text-sm font-semibold text-foreground">{option.label}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

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
