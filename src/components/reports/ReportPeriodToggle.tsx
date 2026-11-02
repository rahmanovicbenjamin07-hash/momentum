import { cn } from 'cn'

export type ReportKind = 'month' | 'year'

type ReportPeriodToggleProps = {
  value: ReportKind
  /** e.g. "October 2026". */
  monthLabel: string
  /** e.g. "2026 so far". */
  yearLabel: string
  onChange: (value: ReportKind) => void
}

/** "October 2026" / "2026 so far". Hidden when printing. */
export function ReportPeriodToggle({ value, monthLabel, yearLabel, onChange }: ReportPeriodToggleProps) {
  const options: { value: ReportKind; label: string }[] = [
    { value: 'month', label: monthLabel },
    { value: 'year', label: yearLabel },
  ]
  return (
    <div role="group" aria-label="Report period" className="flex rounded-full border border-border bg-muted/60 p-1 print:hidden">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 rounded-full px-3.5 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            value === o.value ? 'bg-brand-tint font-semibold text-brand ring-1 ring-brand ring-inset' : 'text-ink-2 hover:bg-card/60 hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
