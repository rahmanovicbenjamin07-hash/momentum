import type { ReactNode } from 'react'
import { MeterBar } from '@/components/MeterBar'
import { GOAL_STATUS_BAR, type GoalStatus } from './meta'

type ObjectiveHeaderProps = {
  /** e.g. "3 KEY RESULTS · BY 3 MAY 2027". */
  line: string
  title: string
  /** Why it matters; hidden when empty. */
  why: string | null
  /** Buttons in the top right corner (Add key result, Edit goal, Delete goal). */
  actions?: ReactNode
  /** Overall progress bar; leave out when there's one key result (its own bar says the same). */
  overall?: { percent: number; status: GoalStatus | null }
}

/** Top of a goal: line, big title and why it matters on the left, buttons on the right. */
export function ObjectiveHeader({ line, title, why, actions, overall }: ObjectiveHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-64">
          <p className="text-xs font-medium text-ink-2">{line}</p>
          <h2 className="mt-1 text-[22px] leading-tight font-bold break-words text-foreground">{title}</h2>
          {why && <p className="mt-1 text-[13px] text-ink-2">{why}</p>}
        </div>
        {actions && <div className="flex min-w-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {overall && (
        <div className="flex items-center gap-3">
          <MeterBar
            value={overall.percent}
            label={`${title}: ${overall.percent}% done`}
            color={overall.status ? GOAL_STATUS_BAR[overall.status] : undefined}
            className="flex-1"
          />
          <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">{overall.percent}% done overall</span>
        </div>
      )}
    </div>
  )
}
