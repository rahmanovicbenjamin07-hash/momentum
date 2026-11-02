import { cn } from 'cn'
import { GOAL_STATUS_META, NO_STATUS_META, type GoalStatus } from './meta'

/** Coloured goal status label, e.g. "Ahead" or "Slightly behind"; null = "No key results". */
export function GoalStatusPill({ status, className }: { status: GoalStatus | null; className?: string }) {
  const { label, pill } = status ? GOAL_STATUS_META[status] : NO_STATUS_META
  return (
    <span
      className={cn('inline-flex h-6 w-fit items-center rounded-lg px-2 text-xs font-semibold whitespace-nowrap', pill, className)}
    >
      {label}
    </span>
  )
}
