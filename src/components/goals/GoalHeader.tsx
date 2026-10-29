import { GoalStatusPill } from './GoalStatusPill'
import type { GoalStatus } from './meta'

type GoalHeaderProps = {
  /** e.g. "MY METRIC · Money earned · deadline 1 Jan 2027". */
  sourceLine: string
  title: string
  /** e.g. "€13,950 + €1,910 expected of €18,000". */
  progressText: string
  status: GoalStatus
}

/** Top of the goal card: source line, big title, progress text and status pill. */
export function GoalHeader({ sourceLine, title, progressText, status }: GoalHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-2">{sourceLine}</p>
        <h2 className="mt-1 text-[22px] leading-tight font-bold text-foreground">{title}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-ink-2 tabular-nums">{progressText}</p>
        <GoalStatusPill status={status} />
      </div>
    </div>
  )
}
