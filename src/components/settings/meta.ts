export const SETTINGS_SECTIONS = [
  { key: 'appearance', label: 'Appearance' },
  { key: 'datetime', label: 'Date & time' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'data', label: 'Data & backups' },
  { key: 'integrations', label: 'Integrations' },
] as const
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]['key']

export const isSettingsSection = (value: unknown): value is SettingsSection =>
  SETTINGS_SECTIONS.some((s) => s.key === value)

/** Id of each section's card. */
export const settingsSectionId = (section: SettingsSection) => `settings-${section}`

/** Id of each tab button, so the panel can be labelled by it. */
export const settingsTabId = (section: SettingsSection) => `settings-tab-${section}`

/** Id of the one panel under the tabs that shows the picked section. */
export const SETTINGS_PANEL_ID = 'settings-panel'

/** Card shell for each section. */
export const sectionClass = 'rounded-xl border border-border bg-card outline-none'
export const selectClass =
  'h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

export const comingLaterClass = 'border border-border bg-card text-ink-2'
