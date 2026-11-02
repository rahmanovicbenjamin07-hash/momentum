import { useRef, type KeyboardEvent } from 'react'
import { cn } from 'cn'
import { SETTINGS_PANEL_ID, SETTINGS_SECTIONS, settingsTabId, type SettingsSection } from './meta'

type SettingsTabsProps = {
  active: SettingsSection
  onSelect: (section: SettingsSection) => void
}

/**
 * Appearance / Date & time / Notifications / Data & backups / Integrations.
 * Real tabs: only the picked section is shown below. Arrow keys, Home and End move between them.
 */
export function SettingsTabs({ active, onSelect }: SettingsTabsProps) {
  const refs = useRef(new Map<SettingsSection, HTMLButtonElement>())

  const onKeyDown = (event: KeyboardEvent) => {
    const index = SETTINGS_SECTIONS.findIndex((s) => s.key === active)
    const last = SETTINGS_SECTIONS.length - 1
    const next =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null
    const key = next === null ? undefined : SETTINGS_SECTIONS[next]?.key
    if (!key) return
    event.preventDefault()
    onSelect(key)
    refs.current.get(key)?.focus()
  }

  return (
    <div className="-mx-1 mb-5 overflow-x-auto shadow-[inset_0_-1px_0_var(--border)]">
      <div role="tablist" aria-label="Settings sections" className="flex min-w-max gap-1 px-1">
        {SETTINGS_SECTIONS.map((section) => {
          const selected = active === section.key
          return (
            <button
              key={section.key}
              ref={(el) => {
                if (el) refs.current.set(section.key, el)
                else refs.current.delete(section.key)
              }}
              type="button"
              role="tab"
              id={settingsTabId(section.key)}
              aria-selected={selected}
              aria-controls={SETTINGS_PANEL_ID}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(section.key)}
              onKeyDown={onKeyDown}
              className={cn(
                'inline-flex h-11 items-center border-b-2 px-3.5 text-sm font-medium whitespace-nowrap outline-none focus-visible:rounded-t-lg focus-visible:ring-3 focus-visible:ring-ring/50',
                selected ? 'border-brand text-brand' : 'border-transparent text-ink-2 hover:text-foreground',
              )}
            >
              {section.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
