import { useEffect, useId, useRef, useState } from 'react'
import { cn } from 'cn'
import { Textarea } from '@/components/ui/textarea'
import { dailyNoteFormSchema } from '@/schemas/today'

const NOTE_MAX = 5000
const ENERGY_LEVELS = [1, 2, 3, 4, 5] as const

type DailyNoteCardProps = {
  /** Saved note. The card keeps its own copy while you type, so give it `key={date}` to reset it for another day. */
  note: string
  energy: number | null
  /** Called 800 ms after typing stops, and right away when the field loses focus or the card closes. */
  onSaveNote: (note: string) => void
  /** Clicking the selected level again clears it (null). */
  onEnergyChange: (energy: number | null) => void
  /** Wait after the last keystroke, in ms. */
  delay?: number
}

/** "Daily note" side card: autosaving textarea + energy 1–5. */
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
      <Textarea
        aria-labelledby={titleId}
        value={text}
        maxLength={NOTE_MAX}
        placeholder="What went well? What blocked you?"
        className="mt-3 min-h-[88px] resize-y bg-card"
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

      <div className="mt-3 flex items-center gap-3">
        <span id={energyId} className="text-[13px] text-ink-2">
          Energy
        </span>
        <div role="group" aria-labelledby={energyId} className="grid flex-1 grid-cols-5 gap-1.5">
          {ENERGY_LEVELS.map((level) => {
            const selected = energy === level
            return (
              <button
                key={level}
                type="button"
                aria-pressed={selected}
                aria-label={`Energy ${level} of 5`}
                onClick={() => onEnergyChange(selected ? null : level)}
                className={cn(
                  'h-10 rounded-lg border text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  selected ? 'border-brand bg-brand text-white' : 'border-border bg-card text-foreground hover:bg-muted',
                )}
              >
                {level}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
