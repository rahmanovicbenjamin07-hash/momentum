import { useId } from 'react'
import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cardClass, TONE } from './meta'
import { StatTile } from './StatTile'

export type RunningExperiment = {
  title: string
  day: number
  totalDays: number
  /** e.g. "Reply rate before". */
  beforeLabel: string
  /** Already formatted, e.g. "14.2%". */
  before: string
  /** Already formatted; null until there's data. */
  during: string | null
  /** True green, false red, null grey. */
  better: boolean | null
  note?: string
}

/** Leave out the experiment fields (pass only onStart) for the empty state. */
type RunningExperimentCardProps = (RunningExperiment | { title?: undefined }) & {
  onStart?: () => void
}

/** The experiment running now: day x of y, progress bar, before vs during. */
export function RunningExperimentCard(props: RunningExperimentCardProps) {
  const id = useId()

  if (props.title === undefined) {
    return (
      <section aria-labelledby={id} className={cardClass}>
        <h2 id={id} className="text-base font-semibold text-foreground">
          Running experiment
        </h2>
        <p className="mt-2 text-sm text-ink-2">No experiment running</p>
        {props.onStart && (
          <Button variant="link" className="mt-1 h-auto p-0 text-brand" onClick={props.onStart}>
            Start one
          </Button>
        )}
      </section>
    )
  }

  const { title, day, totalDays, beforeLabel, before, during, better, note } = props
  const pct = totalDays > 0 ? Math.min(100, Math.max(0, (day / totalDays) * 100)) : 0

  return (
    <section aria-labelledby={id} className={cardClass}>
      <div className="flex items-center justify-between gap-2">
        <h2 id={id} className="text-base font-semibold text-foreground">
          Running experiment
        </h2>
        <Badge className={cn('tabular-nums', TONE.brand)}>
          Day {day} of {totalDays}
        </Badge>
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
      <div
        role="progressbar"
        aria-label="Experiment progress"
        aria-valuemin={0}
        aria-valuemax={totalDays}
        aria-valuenow={day}
        aria-valuetext={`Day ${day} of ${totalDays}`}
        className="mt-2.5 h-2 overflow-hidden rounded-lg bg-brand-tint"
      >
        <div className="h-full rounded-lg bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <StatTile label={beforeLabel} value={before} />
        <StatTile label="During" value={during ?? '—'} tone={better === null ? 'neutral' : better ? 'good' : 'bad'} />
      </div>
      {note && <p className="mt-2.5 text-xs text-ink-3">{note}</p>}
    </section>
  )
}
