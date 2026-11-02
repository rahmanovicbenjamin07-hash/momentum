import { useEffect, useId, useRef, useState } from 'react'
import { cn } from 'cn'
import { Textarea } from '@/components/ui/textarea'
import { dailyNoteFormSchema } from '@/schemas/today'

const NOTE_MAX = 5000
const ENERGY_MAX = 5

type DailyNoteCardProps = {
  /** Saved note. The card keeps its own copy while you type, so give it `key={date}` to reset it for another day. */
  note: string
  energy: number | null
  /** Called 800 ms after typing stops, and right away when the field loses focus or the card closes. */
  onSaveNote: (note: string) => void
  /** 1–5 from the slider; "Clear" sends null. */
  onEnergyChange: (energy: number | null) => void
  /** Wait after the last keystroke, in ms. */
  delay?: number
}

/** "Daily note" side card: autosaving textarea + energy slider 1–5. */
export function DailyNoteCard({ note, energy, onSaveNote, onEnergyChange, delay = 800 }: DailyNoteCardProps) {
  const titleId = useId()
  const energyId = useId()
  const [text, setText] = useState(note)
  const [saved, setSaved] = useState(false)

  // Refs so the timer and the unmount cleanup always use the latest values.
  const pending = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const saveRef = useRef(onSaveNote)
  useEffect(() => {
    saveRef.current = onSaveNote
  }, [onSaveNote])

  function flush() {
    clearTimeout(timer.current)
    timer.current = undefined
    const value = pending.current
    if (value === null) return
    pending.current = null
    if (!dailyNoteFormSchema.shape.note.safeParse(value).success) return
    saveRef.current(value)
    setSaved(true)
  }

  // Save anything still waiting when the card goes away (e.g. switching day).
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      if (pending.current !== null) saveRef.current(pending.current)
    },
    [],
  )

  return (
    <section aria-labelledby={titleId} className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          Daily note
        </h2>
        <p aria-live="polite" className="text-xs text-ink-3">
          {saved ? 'Saved' : ''}
        </p>
      </div>
      <div className="glass-input-wrap mt-3">
        <Textarea
          aria-labelledby={titleId}
          value={text}
          maxLength={NOTE_MAX}
          placeholder="What went well? What blocked you?"
          className="glass-input min-h-[88px] resize-y"
          onChange={(e) => {
            const value = e.currentTarget.value
            setText(value)
            setSaved(false)
            pending.current = value
            clearTimeout(timer.current)
            timer.current = setTimeout(flush, delay)
          }}
          onBlur={flush}
        />
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={energyId} className="text-[13px] text-ink-2">
            Energy
          </label>
          <div className="flex items-baseline gap-2">
            {energy !== null && (
              <button
                type="button"
                onClick={() => onEnergyChange(null)}
                className="rounded text-xs text-ink-3 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                Clear
              </button>
            )}
            <span className={cn('text-sm tabular-nums', energy === null ? 'text-ink-3' : 'font-semibold text-foreground')}>
              {energy === null ? 'Not set' : `${energy}/${ENERGY_MAX}`}
            </span>
          </div>
        </div>
        {/* Not set yet: the thumb waits in the middle, faded; the first click or arrow key sets it. */}
        <input
          id={energyId}
          type="range"
          min={1}
          max={ENERGY_MAX}
          step={1}
          value={energy ?? 3}
          aria-valuetext={energy === null ? 'Not set' : `${energy} of ${ENERGY_MAX}`}
          onChange={(e) => onEnergyChange(Number(e.currentTarget.value))}
          onClick={(e) => energy === null && onEnergyChange(Number(e.currentTarget.value))}
          className={cn('mt-2 block w-full cursor-pointer accent-brand', energy === null && 'opacity-50')}
        />
        <div aria-hidden="true" className="mt-1 flex justify-between px-0.5 text-[11px] text-ink-3">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </section>
  )
}
