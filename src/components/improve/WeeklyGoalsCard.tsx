import { useId } from 'react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { cardClass } from './meta'

export type WeeklyGoalRow = {
  /** e.g. "20 outreaches". */
  label: string
  /** e.g. "11 / 20" or "83%". */
  valueText: string
  /** 0–100, bar width. */
  pct: number
  onTrack: boolean
}

type WeeklyGoalsCardProps = {
  rows: readonly WeeklyGoalRow[]
  onEdit: () => void
}

/** "This week's goals": one bar per weekly target, green when on track. */
export function WeeklyGoalsCard({ rows, onEdit }: WeeklyGoalsCardProps) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cardClass}>
      <div className="flex items-center justify-between gap-2">
        <h2 id={id} className="text-base font-semibold text-foreground">
          This week’s goals
        </h2>
        <Button variant="link" className="h-auto p-0 text-brand" onClick={onEdit}>
          Edit<span className="sr-only"> weekly goals</span>
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-ink-2">No weekly goals set yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="font-medium text-foreground">{row.label}</span>
                <span className={cn('tabular-nums', row.onTrack ? 'font-semibold text-good' : 'text-ink-2')}>
                  {row.valueText}
                  {row.onTrack && ' · on track'}
                </span>
              </div>
              <div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden rounded-lg bg-background">
                <div
                  className={cn('h-full rounded-lg', row.onTrack ? 'bg-good' : 'bg-brand')}
                  style={{ width: `${Math.min(100, Math.max(0, row.pct))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
