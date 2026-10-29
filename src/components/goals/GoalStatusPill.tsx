import { cn } from 'cn'
import { GOAL_STATUS_META, type GoalStatus } from './meta'

/** Coloured goal status label, e.g. "Ahead" or "Slightly behind". */
export function GoalStatusPill({ status, className }: { status: GoalStatus; className?: string }) {
  const { label, pill } = GOAL_STATUS_META[status]
  return (
    <span
      className={cn('inline-flex h-6 w-fit items-center rounded-lg px-2 text-xs font-semibold whitespace-nowrap', pill, className)}
    >
      {label}
    </span>
  )
}
