import { cn } from 'cn'
import { LEAD_STAGES, STAGE_META, type LeadStage, type StageFilterValue } from './meta'

type StageCountsProps = {
  /** Leads per stage. Missing stages count as 0. */
  counts: Partial<Record<LeadStage, number>>
  value: StageFilterValue
  onChange: (value: StageFilterValue) => void
}

/** Card with "All stages" + one clickable count per stage; the active one is outlined in indigo. */
export function StageCounts({ counts, value, onChange }: StageCountsProps) {
  const total = LEAD_STAGES.reduce((sum, s) => sum + (counts[s] ?? 0), 0)
  const options = [
    { value: 'all' as StageFilterValue, label: 'All stages', count: total },
    ...LEAD_STAGES.map((s) => ({ value: s as StageFilterValue, label: STAGE_META[s].label, count: counts[s] ?? 0 })),
  ]

  return (
    <div
      role="group"
      aria-label="Filter by stage"
      className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-2 sm:grid-cols-4 lg:grid-cols-8"
    >
      {options.map(({ value: option, label, count }) => {
        const selected = value === option
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            aria-label={`${label}, ${count}`}
            onClick={() => onChange(option)}
            className={cn(
              'flex flex-col items-start rounded-lg border px-3 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              selected ? 'border-brand bg-brand-tint' : 'border-transparent hover:bg-muted',
            )}
          >
            <span className="text-xs text-ink-2">{label}</span>
            <span className="text-xl font-bold text-foreground tabular-nums">{count}</span>
          </button>
        )
      })}
    </div>
  )
}
