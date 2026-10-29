import { useRef, type KeyboardEvent } from 'react'
import { cn } from 'cn'
import { GOAL_STATUS_META, type GoalStatus } from './meta'

export type GoalChip = { id: string; label: string; status: GoalStatus }

type GoalChipsProps = {
  goals: GoalChip[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/**
 * One row of goal chips that scrolls sideways. Tab reaches the selected chip;
 * ← → (and Home / End) move between chips, Enter or Space selects.
 */
export function GoalChips({ goals, selectedId, onSelect }: GoalChipsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const selectedIndex = goals.findIndex((g) => g.id === selectedId)
  const tabIndexOf = (i: number) => (i === (selectedIndex === -1 ? 0 : selectedIndex) ? 0 : -1)

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const current = refs.current.findIndex((el) => el === document.activeElement)
    if (current === -1) return
    const last = goals.length - 1
    const next =
      event.key === 'ArrowRight'
        ? current === last ? 0 : current + 1
        : event.key === 'ArrowLeft'
          ? current === 0 ? last : current - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (next === null) return
    event.preventDefault()
    refs.current[next]?.focus()
  }

  return (
    <div
      role="group"
      aria-label="Goals"
      className="relative -m-1 flex gap-2 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {goals.map((goal, i) => {
        const selected = goal.id === selectedId
        const { label: statusLabel, dot } = GOAL_STATUS_META[goal.status]
        return (
          <button
            key={goal.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            aria-pressed={selected}
            tabIndex={tabIndexOf(i)}
            onClick={() => onSelect(goal.id)}
            onKeyDown={onKeyDown}
            className={cn(
              'inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold whitespace-nowrap',
              'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none',
              selected ? 'border-foreground bg-foreground text-white' : 'border-border bg-card text-foreground hover:bg-muted',
            )}
          >
            <span aria-hidden className={cn('size-2 rounded-full', dot)} />
            {goal.label}
            <span className="sr-only">, {statusLabel}</span>
          </button>
        )
      })}
    </div>
  )
}
