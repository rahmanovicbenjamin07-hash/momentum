import { cn } from 'cn'
import { STATS_RANGES, type StatsRange } from './meta'

type RangeToggleProps = {
  value: StatsRange
  onChange: (value: StatsRange) => void
}

/** 7 days / 30 days / 90 days. */
export function RangeToggle({ value, onChange }: RangeToggleProps) {
  return (
    <div role="group" aria-label="Date range" className="flex rounded-lg border border-border bg-muted p-1">
      {STATS_RANGES.map((days) => {
        const selected = value === days
        return (
          <button
            key={days}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(days)}
            className={cn(
              'h-8 rounded-md px-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              selected ? 'bg-card text-foreground' : 'text-ink-2 hover:text-foreground',
            )}
          >
            {days} days
          </button>
        )
      })}
    </div>
  )
}
