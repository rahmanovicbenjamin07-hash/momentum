import { useRef } from 'react'
import { cn } from 'cn'
import { CircleX, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toHHMM, WEEKDAY_LETTERS, WEEKDAY_NAMES } from '@/lib/today-list'
import type { RoutineItem } from '@/schemas/today'

export type RoutineEditorItem = Pick<RoutineItem, 'id' | 'title' | 'days' | 'time'>

export type RoutineEditorHandlers = {
  onChangeDays: (id: string, days: boolean[]) => void
  /** "HH:MM", or null for "anytime". */
  onChangeTime: (id: string, time: string | null) => void
  onRemove: (id: string) => void
}

type RoutineEditorProps = RoutineEditorHandlers & {
  items: readonly RoutineEditorItem[]
  /** When given, a Done button is shown at the bottom (TodayTasksCard has its own in the header). */
  onDone?: () => void
}

/** "Edit repeating" mode: day toggles M–S, optional time, remove. */
export function RoutineEditor({ items, onChangeDays, onChangeTime, onRemove, onDone }: RoutineEditorProps) {
  return (
    <div>
      <p className="border-t border-border px-4 py-2.5 text-[13px] text-ink-2">
        Repeating tasks: pick the days each one comes back. Time is optional — leave it empty for “anytime”.
      </p>
      {items.length === 0 ? (
        <p className="border-t border-border px-4 py-6 text-center text-ink-2">No repeating tasks yet.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <RoutineEditorRow
              key={item.id}
              item={item}
              onChangeDays={onChangeDays}
              onChangeTime={onChangeTime}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
        <p className="text-[13px] text-ink-2">To add a repeating task, use the bar above and set Repeat.</p>
        {onDone && (
          <Button variant="outline" size="sm" className="bg-card" onClick={onDone}>
            Done
          </Button>
        )}
      </div>
    </div>
  )
}

function RoutineEditorRow({ item, onChangeDays, onChangeTime, onRemove }: RoutineEditorHandlers & { item: RoutineEditorItem }) {
  function toggleDay(index: number) {
    onChangeDays(
      item.id,
      item.days.map((on, i) => (i === index ? !on : on)),
    )
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-4 py-3">
      <span className="min-w-0 flex-1 basis-40 text-[15px] break-words text-foreground">{item.title}</span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="group" aria-label={`Days for ${item.title}`} className="flex gap-1">
          {WEEKDAY_LETTERS.map((letter, i) => {
            const on = item.days[i] === true
            return (
              <button
                key={WEEKDAY_NAMES[i]}
                type="button"
                aria-pressed={on}
                aria-label={WEEKDAY_NAMES[i]}
                onClick={() => toggleDay(i)}
                className={cn(
                  'grid size-9 place-items-center rounded-lg border text-xs font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  on ? 'border-brand bg-brand text-white hover:bg-brand/90' : 'border-border bg-card text-foreground hover:bg-muted',
                )}
              >
                {letter}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1">
          <TimeField
            // Remount when the saved time changes so the field shows it.
            key={item.time ?? ''}
            title={item.title}
            time={toHHMM(item.time)}
            onCommit={(time) => onChangeTime(item.id, time)}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${item.title}`}
            className="text-ink-3 hover:text-bad"
            onClick={() => onRemove(item.id)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </div>
    </li>
  )
}

/**
 * Time input that saves on blur or Enter, not on every keystroke,
 * so a half-typed time never wipes the saved one.
 */
function TimeField({ title, time, onCommit }: { title: string; time: string | null; onCommit: (time: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  function commit(value: string) {
    const next = value === '' ? null : value
    if (next !== time) onCommit(next)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="time"
        defaultValue={time ?? ''}
        aria-label={`Time for ${title}`}
        onBlur={(e) => commit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className={cn(
          'h-9 w-[152px] rounded-lg border border-input bg-card pl-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          time ? 'pr-8' : 'pr-2',
        )}
      />
      {time && (
        <button
          type="button"
          aria-label={`Clear time for ${title}`}
          onClick={() => {
            if (inputRef.current) inputRef.current.value = ''
            onCommit(null)
          }}
          className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-md text-ink-3 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <CircleX className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
