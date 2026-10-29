import { AlignJustify } from 'lucide-react'
import { cn } from 'cn'
import { LEAD_SOURCES, SOURCE_META, type LeadSource, type SourceFilterValue } from './meta'

type SourceFilterProps = {
  /** Leads per source. Missing sources count as 0. */
  counts: Partial<Record<LeadSource, number>>
  value: SourceFilterValue
  onChange: (value: SourceFilterValue) => void
}

/** Row of source chips with counts: All sources, LinkedIn, Google Maps, In person, Upwork (+ Other when used). */
export function SourceFilter({ counts, value, onChange }: SourceFilterProps) {
  const total = LEAD_SOURCES.reduce((sum, s) => sum + (counts[s] ?? 0), 0)
  const showOther = (counts.other ?? 0) > 0 || value === 'other'
  const sources = LEAD_SOURCES.filter((s) => s !== 'other' || showOther)

  const options = [
    { value: 'all' as SourceFilterValue, label: 'All sources', icon: AlignJustify, count: total },
    ...sources.map((s) => ({ value: s as SourceFilterValue, label: SOURCE_META[s].label, icon: SOURCE_META[s].icon, count: counts[s] ?? 0 })),
  ]

  return (
    <div role="group" aria-label="Filter by source" className="flex flex-wrap gap-2">
      {options.map(({ value: option, label, icon: Icon, count }) => {
        const selected = value === option
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            aria-label={`${label}, ${count}`}
            onClick={() => onChange(option)}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              selected ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground hover:bg-muted',
            )}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {label}
            <span
              className={cn(
                'rounded-md px-1.5 text-xs font-medium tabular-nums',
                selected ? 'bg-background/20 text-background' : 'bg-muted text-ink-2',
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
