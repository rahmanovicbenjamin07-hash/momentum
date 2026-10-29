import { useId } from 'react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'

type PaceSliderProps = {
  value: number
  min: number
  max: number
  step: number
  /** Pace needed to finish by the deadline (null when it has passed). The value turns green at or above it. */
  neededPace: number | null
  /** e.g. 2100 → "€2,100". */
  formatValue: (value: number) => string
  onChange: (value: number) => void
  /** "My pace": back to the real pace. */
  onReset: () => void
}

/** "Monthly pace" slider under the goal chart. */
export function PaceSlider({ value, min, max, step, neededPace, formatValue, onChange, onReset }: PaceSliderProps) {
  const id = useId()
  const enough = neededPace !== null && value >= neededPace
  return (
    <div className="rounded-[10px] border border-border bg-background/60 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-foreground">
          Monthly pace
        </label>
        <Button type="button" variant="outline" className="bg-card" onClick={onReset}>
          My pace
        </Button>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={`${formatValue(value)} a month`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-2 w-full cursor-pointer accent-brand"
      />
      <p aria-live="polite" className={cn('mt-2 text-[22px] font-bold tabular-nums', enough ? 'text-good' : 'text-warn')}>
        {formatValue(value)} / mo
      </p>
    </div>
  )
}
