import { cn } from 'cn'

export type KpiChange = {
  /** Shown as is, e.g. "+6 pts", "+11 vs prior 30 days", "−2". */
  text: string
  direction: 'up' | 'down' | 'flat'
  /** False when going down is the good direction. Default true. */
  upIsGood?: boolean
}

type KpiCardProps = {
  label: string
  /** Already formatted, e.g. "75%", "12 days". */
  value: string
  /** Change vs the previous period, coloured green (better) or red (worse). */
  change?: KpiChange
  /** Grey line instead of a change, e.g. "Best 21 days". */
  note?: string
}

const DIRECTION_WORD = { up: 'Up', down: 'Down', flat: 'No change' } as const

function tone({ direction, upIsGood = true }: KpiChange): string {
  if (direction === 'flat') return 'text-ink-2'
  return (direction === 'up') === upIsGood ? 'text-good' : 'text-bad'
}

/** One number on the Stats overview: label, big value, and its change in colour. */
export function KpiCard({ label, value, change, note }: KpiCardProps) {
  return (
    <section aria-label={label} className="flex min-w-0 flex-col rounded-xl border border-border bg-card px-5 py-4">
      <h2 className="truncate text-sm text-ink-2">{label}</h2>
      <p className="mt-1 text-[28px] leading-tight font-bold tracking-tight text-foreground">{value}</p>
      {change ? (
        <p className={cn('mt-1 text-xs font-semibold', tone(change))}>
          <span className="sr-only">{DIRECTION_WORD[change.direction]}: </span>
          {change.text}
        </p>
      ) : note ? (
        <p className="mt-1 text-xs font-medium text-ink-2">{note}</p>
      ) : null}
    </section>
  )
}
