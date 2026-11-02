import { Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { MeterBar } from '@/components/MeterBar'
import { Button } from '@/components/ui/button'
import { GOAL_STATUS_BAR, type GoalStatus } from './meta'

type KeyResultCardProps = {
  title: string
  /** The goal has this one key result with the same name: show it to screen readers only. */
  titleHidden?: boolean
  /** Top left, under the title: e.g. the forecast sentence and what's needed. */
  headline?: ReactNode
  /** Top right, before Delete: e.g. Update or Mark as done. */
  actions?: ReactNode
  /** Under the bar, e.g. "€4,200 of €10,000" or "3 of 5 steps done". */
  progress: string
  /** 0–100. */
  percent: number
  /** Only colours the bar. */
  status: GoalStatus
  onDelete: () => void
  /** What this kind shows below: chart, steps, week strip… */
  children?: ReactNode
}

/** One key result inside a goal: title and headline on the left, buttons on the right, then the progress bar and its body. */
export function KeyResultCard({
  title,
  titleHidden = false,
  headline,
  actions,
  progress,
  percent,
  status,
  onDelete,
  children,
}: KeyResultCardProps) {
  return (
    <section aria-label={title} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <h3 className={titleHidden ? 'sr-only' : 'mb-1 text-base leading-snug font-semibold break-words text-foreground'}>{title}</h3>
          {headline}
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          {actions}
          <Button variant="outline" aria-label={`Delete key result ${title}`} onClick={onDelete}>
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <MeterBar value={percent} label={`${title}: ${percent}% done`} color={GOAL_STATUS_BAR[status]} className="flex-1" />
          <span className="w-16 shrink-0 text-right text-sm font-semibold text-foreground tabular-nums">{percent}% done</span>
        </div>
        <p className="text-[13px] text-ink-2 tabular-nums">{progress}</p>
      </div>
      {children}
    </section>
  )
}
