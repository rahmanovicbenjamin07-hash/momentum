import { cn } from 'cn'
import { LEAD_STAGES, STAGE_META, type LeadStage, type StageFilterValue } from './meta'

type StageCountsProps = {
  /** Leads per stage. Missing stages count as 0. */
  counts: Partial<Record<LeadStage, number>>
  value: StageFilterValue
  onChange: (value: StageFilterValue) => void
}

/**
 * Card with "All stages" + one clickable count per stage, each with its stage colour dot.
 * The active one is a raised white tile (like an iPhone segmented control), not a coloured outline.
 */
export function StageCounts({ counts, value, onChange }: StageCountsProps) {
  const total = LEAD_STAGES.reduce((sum, s) => sum + (counts[s] ?? 0), 0)
  const options = [
    { value: 'all' as StageFilterValue, label: 'All stages', count: total, dot: null },
    ...LEAD_STAGES.map((s) => ({ value: s as StageFilterValue, label: STAGE_META[s].label, count: counts[s] ?? 0, dot: STAGE_META[s].dot })),
  ]

  return (
    <div
      role="group"
      aria-label="Filter by stage"
      className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-2 sm:grid-cols-4 lg:grid-cols-8"
    >
      {options.map(({ value: option, label, count, dot }) => {
        const selected = value === option
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            aria-label={`${label}, ${count}`}
            onClick={() => onChange(option)}
            className={cn(
              'flex flex-col items-start rounded-[10px] border px-3 py-2 text-left outline-none transition-[background-color,box-shadow,border-color] duration-200 ease-out',
              'focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none',
              selected
                ? 'border-white/80 bg-white shadow-[0_1px_2px_rgb(17_24_39/0.06),0_4px_12px_rgb(17_24_39/0.08)] dark:border-white/10 dark:bg-white/10 dark:shadow-none'
                : 'border-transparent hover:bg-white/50 dark:hover:bg-white/5',
            )}
          >
            <span className={cn('flex items-center gap-1.5 text-xs', selected ? 'font-semibold text-foreground' : 'text-ink-2')}>
              {dot && <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', dot)} />}
              {label}
            </span>
            <span className="text-xl font-bold text-foreground tabular-nums">{count}</span>
          </button>
        )
      })}
    </div>
  )
}
