import { useId } from 'react'
import { cn } from 'cn'
import type { Theme } from '@/schemas/settings'
import { sectionClass, settingsSectionId } from './meta'

type AppearanceSettingsProps = {
  theme: Theme
  onChange: (change: { theme: Theme }) => void
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match my device' },
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

/** "Appearance" card: theme picker (radio cards). */
export function AppearanceSettings({ theme, onChange }: AppearanceSettingsProps) {
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
      <p className="text-[13px] text-ink-2">Choose how Momentum looks. Pick Dark to see this page switch.</p>

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
    </section>
  )
}
