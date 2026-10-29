export const SETTINGS_SECTIONS = [
  { key: 'notifications', label: 'Notifications' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'data', label: 'Data & backups' },
  { key: 'integrations', label: 'Integrations' },
] as const
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]['key']

/** Id of each section's card, so the tabs can scroll to it. */
export const settingsSectionId = (section: SettingsSection) => `settings-${section}`

/** Card shell for each section; scroll-mt leaves a little room above it when a tab scrolls to it. */
export const sectionClass = 'scroll-mt-4 rounded-xl border border-border bg-card outline-none'

export const selectClass =
  'h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

export const comingLaterClass = 'border border-border bg-card text-ink-2'
