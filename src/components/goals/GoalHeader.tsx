import type { ReactNode } from 'react'
import { GoalStatusPill } from './GoalStatusPill'
import type { GoalStatus } from './meta'

type GoalHeaderProps = {
  title: string
  /** e.g. "€13,950 + €1,910 expected of €18,000". */
  progressText: string
  status: GoalStatus
  /** Buttons on the right, e.g. Update and Delete goal (they wrap below on small screens). */
  actions?: ReactNode
}

/** Top of the goal card: big title with progress text and status pill under it, buttons on the right. */
export function GoalHeader({ title, progressText, status, actions }: GoalHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h2 className="text-[22px] leading-tight font-bold text-foreground">{title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="text-sm text-ink-2 tabular-nums">{progressText}</p>
          <GoalStatusPill status={status} />
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
