import type { ExperimentMetric, ExperimentStatus, IdeaStatus, ReviewStatus } from '@/schemas/improve'

export type ImproveTab = 'review' | 'lessons' | 'experiments' | 'ideas'

/** Ids so the page can link a tab to its panel (aria-controls / aria-labelledby). */
export const improveTabId = (tab: ImproveTab) => `improve-tab-${tab}`
export const improvePanelId = (tab: ImproveTab) => `improve-panel-${tab}`

/** Pill colours (status tokens from CLAUDE.md). */
export const TONE = {
  good: 'bg-good-tint text-good',
  warn: 'bg-warn-tint text-warn',
  bad: 'bg-bad-tint text-bad',
  info: 'bg-info-tint text-info',
  brand: 'bg-brand-tint text-brand',
  neutral: 'bg-background text-ink-2',
} as const
export type Tone = keyof typeof TONE

type Pill = { label: string; tone: Tone }

export const REVIEW_STATUS_PILL: Record<ReviewStatus, Pill> = {
  draft: { label: 'Draft', tone: 'warn' },
  saved: { label: 'Saved', tone: 'good' },
}

export const EXPERIMENT_STATUS_PILL: Record<ExperimentStatus, Pill> = {
  running: { label: 'Running', tone: 'info' },
  kept: { label: 'Kept', tone: 'good' },
  dropped: { label: 'Dropped', tone: 'bad' },
}

export const IDEA_STATUS_PILL: Record<IdeaStatus, Pill> = {
  new: { label: 'New', tone: 'neutral' },
  testing: { label: 'Testing', tone: 'info' },
  done: { label: 'Done', tone: 'good' },
  dropped: { label: 'Dropped', tone: 'bad' },
}

/** Metrics measured as a percentage; the rest are counts. */
const PERCENT_METRICS: ReadonlySet<ExperimentMetric> = new Set(['reply_rate', 'task_completion', 'routine_rate'])

/** "14.2%" for rates, "24" for counts, "—" when not measured. */
export function formatMetricValue(metric: ExperimentMetric, value: number | null): string {
  if (value === null) return '—'
  return PERCENT_METRICS.has(metric) ? `${value.toFixed(1)}%` : String(Math.round(value))
}

/** "+48%" / "−17%" change from before to during; null when it can't be worked out. */
export function changeText(
  before: number | null,
  during: number | null,
): { text: string; tone: 'good' | 'bad' | 'neutral' } | null {
  if (before === null || during === null || before === 0) return null
  const pct = Math.round(((during - before) / before) * 100)
  if (pct === 0) return { text: '0%', tone: 'neutral' }
  return pct > 0 ? { text: `+${pct}%`, tone: 'good' } : { text: `−${Math.abs(pct)}%`, tone: 'bad' }
}

export const selectClass =
  'h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export const cardClass = 'rounded-xl border border-border bg-card p-5'
