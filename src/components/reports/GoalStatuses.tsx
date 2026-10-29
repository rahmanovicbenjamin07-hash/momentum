import { useId } from 'react'
import { Link } from 'react-router'
import { cn } from 'cn'

export type GoalStatus = 'ahead' | 'on-track' | 'behind' | 'off-track'

export type GoalStatusRow = {
  id: string
  title: string
  status: GoalStatus
  /** Overrides the badge text, e.g. "On track with open deals". */
  label?: string
}

const STATUS: Record<GoalStatus, { label: string; className: string }> = {
  ahead: { label: 'Ahead', className: 'bg-good-tint text-good' },
  'on-track': { label: 'On track', className: 'bg-info-tint text-info' },
  behind: { label: 'Slightly behind', className: 'bg-warn-tint text-warn' },
  'off-track': { label: 'Off track', className: 'bg-bad-tint text-bad' },
}

type GoalStatusesProps = {
  /** Leave out until Goals (Phase 4) exist: a placeholder is shown instead. */
  goals?: readonly GoalStatusRow[]
  href?: string
}

/** "Goals": each goal's status. Without `goals` (still loading) it shows a short placeholder. */
export function GoalStatuses({ goals, href = '/goals' }: GoalStatusesProps) {
  const id = useId()
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5 print:break-inside-avoid">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          Goals
        </h2>
        <Link to={href} className="rounded-sm text-sm font-semibold text-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 print:hidden">
          Open Goals
        </Link>
      </div>
      {!goals ? (
        <p className="mt-2 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-ink-3">
          Goal statuses show up here once you set goals.
        </p>
      ) : goals.length === 0 ? (
        <p className="mt-2 text-sm text-ink-3">No goals yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {goals.map((goal) => {
            const { label, className } = STATUS[goal.status]
            return (
              <li key={goal.id} className="flex items-center justify-between gap-3 py-3 last:pb-0">
                <span className="min-w-0 text-sm text-foreground">{goal.title}</span>
                <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold [print-color-adjust:exact]', className)}>
                  {goal.label ?? label}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
