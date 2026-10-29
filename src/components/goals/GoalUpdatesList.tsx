import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/dates'
import { formatGoalValue } from '@/lib/goalChart'
import type { GoalUnit, GoalUpdate } from '@/schemas/goals'

/** How many updates show before "Show all". */
const SHOWN = 5

type GoalUpdatesListProps = {
  /** Newest first. */
  updates: readonly GoalUpdate[]
  unit: GoalUnit
  onDelete: (update: GoalUpdate) => void
}

/** The values typed in for a goal, newest first, each with a delete button. */
export function GoalUpdatesList({ updates, unit, onDelete }: GoalUpdatesListProps) {
  const [all, setAll] = useState(false)
  if (updates.length === 0) {
    return <p className="text-[13px] text-ink-2">No updates yet. Use “Update” whenever the number changes.</p>
  }
  const shown = all ? updates : updates.slice(0, SHOWN)

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">Updates</h3>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {shown.map((update) => (
          <li key={update.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="w-24 shrink-0 text-ink-2 tabular-nums">{formatDate(update.date)}</span>
            <span className="font-semibold text-foreground tabular-nums">{formatGoalValue(update.value, unit)}</span>
            <span className="min-w-0 flex-1 truncate text-ink-2">{update.note}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-ink-3 hover:text-bad"
              aria-label={`Delete update from ${formatDate(update.date)}`}
              onClick={() => onDelete(update)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
      {updates.length > SHOWN && (
        <Button variant="link" className="mt-1 h-auto px-0 text-[13px]" onClick={() => setAll((v) => !v)}>
          {all ? 'Show fewer' : `Show all ${updates.length}`}
        </Button>
      )}
    </div>
  )
}
