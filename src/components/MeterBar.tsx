import { cn } from 'cn'

type MeterBarProps = {
  /** 0–100 */
  value: number
  /** Screen-reader name, e.g. "Today’s progress". */
  label: string
  /** Fill colour (any CSS colour). Defaults to the accent. */
  color?: string
  /** Track colour. Defaults to the accent tint. */
  trackColor?: string
  className?: string
}

/** Thin progress bar used on the cards (6px, rounded). */
export function MeterBar({ value, label, color = 'var(--brand)', trackColor = 'var(--brand-tint)', className }: MeterBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn('h-1.5 w-full overflow-hidden rounded-lg', className)}
      style={{ backgroundColor: trackColor }}
    >
      <div className="h-full rounded-lg transition-[width]" style={{ width: `${clamped}%`, backgroundColor: color }} />
    </div>
  )
}
