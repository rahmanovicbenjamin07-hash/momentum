import { Plus } from 'lucide-react'
import { cn } from 'cn'
import { MeterBar } from '@/components/MeterBar'
import { LOG_EVERY_LABELS, type LogEvery, type Unit } from '@/schemas/stats'
import { formatChange, formatMetricValue } from './format'

export type MetricCardData = {
  id: string
  name: string
  unit: Unit
  logEvery: LogEvery
  /** This year so far. */
  total: number
  /** vs the same time last year (0.71 = +71%), or null when last year had nothing. */
  change: number | null
  /** The year compared with, e.g. 2025. */
  lastYear: number
  goal: number | null
  /** total ÷ goal (0.78), or null without a goal. */
  goalShare: number | null
}

type MetricCardsProps = {
  metrics: readonly MetricCardData[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

/** One card per metric (click to show it in the chart) plus a dashed "New metric" card. */
export function MetricCards({ metrics, selectedId, onSelect, onNew }: MetricCardsProps) {
  return (
    <ul aria-label="Your metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => {
        const selected = m.id === selectedId
        return (
          <li key={m.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(m.id)}
              className={cn(
                'flex h-full w-full flex-col rounded-xl border bg-card p-4 text-left outline-none hover:border-brand/50 focus-visible:ring-3 focus-visible:ring-ring/50',
                selected ? 'border-brand ring-1 ring-brand' : 'border-border',
              )}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{m.name}</span>
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
                  {LOG_EVERY_LABELS[m.logEvery]}
                </span>
              </span>
              <span className="mt-1 text-[26px] leading-tight font-bold tracking-tight text-foreground">
                {formatMetricValue(m.total, m.unit)}
              </span>
              <span
                className={cn(
                  'mt-1 text-xs font-semibold',
                  m.change === null ? 'text-ink-2' : m.change >= 0 ? 'text-good' : 'text-bad',
                )}
              >
                {m.change === null ? `Nothing logged by now in ${m.lastYear}` : `${formatChange(m.change)} vs same time ${m.lastYear}`}
              </span>
              {m.goal !== null && m.goalShare !== null ? (
                <>
                  <MeterBar value={m.goalShare * 100} label={`${m.name}: share of yearly goal`} className="mt-3" trackColor="#EEF0F4" />
                  <span className="mt-2 text-xs text-ink-2">
                    {Math.round(m.goalShare * 100)}% of {formatMetricValue(m.goal, m.unit)} goal
                  </span>
                </>
              ) : (
                <span className="mt-3 text-xs text-ink-3">No yearly goal</span>
              )}
            </button>
          </li>
        )
      })}
      <li>
        <button
          type="button"
          onClick={onNew}
          className="flex h-full min-h-32 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink-3/60 bg-transparent p-4 text-center outline-none hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Plus aria-hidden="true" className="size-5 text-brand" />
          <span className="text-sm font-semibold text-brand">New metric</span>
          <span className="text-xs text-ink-2">Anything you want to count</span>
        </button>
      </li>
    </ul>
  )
}
