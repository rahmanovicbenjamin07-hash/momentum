import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Loader2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LIMITS, type ContactNote } from '@/schemas/outreach'
import { joinNotes, parseNote, setNoteChecked, splitNotes } from './format'

/** A note to save: `id` is kept for notes that didn't change, missing for new ones. */
export type NoteDraft = { id?: string; body: string }

type NotesCardProps = {
  notes: readonly Pick<ContactNote, 'id' | 'body'>[]
  /** Saves the whole list. Throw an Error to show its message. */
  onSave: (notes: NoteDraft[]) => Promise<void> | void
}

const MAX_NOTES = 500

const notesFormSchema = z.object({
  text: z
    .string()
    .refine((text) => splitNotes(text).every((body) => body.length <= LIMITS.note), {
      message: `Keep each note under ${LIMITS.note} characters`,
    })
    .refine((text) => splitNotes(text).length <= MAX_NOTES, { message: `Max ${MAX_NOTES} notes` }),
})
type NotesFormValues = z.infer<typeof notesFormSchema>

/** Keeps the id of every entry whose text didn't change. */
function toDrafts(bodies: string[], previous: readonly Pick<ContactNote, 'id' | 'body'>[]): NoteDraft[] {
  const unused = [...previous]
  return bodies.map((body) => {
    const index = unused.findIndex((n) => n.body.trim() === body)
    if (index === -1) return { body }
    const [match] = unused.splice(index, 1)
    return { id: match!.id, body }
  })
}

/** Notes about the lead. "Pain: …" shows the label bold; "[ ] …" lines are tickable to-dos. */
export function NotesCard({ notes, onSave }: NotesCardProps) {
  const id = useId()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle(noteId: string, done: boolean) {
    setError(null)
    try {
      await onSave(notes.map((n) => ({ id: n.id, body: n.id === noteId ? setNoteChecked(n.body, done) : n.body })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save. Try again.')
    }
  }

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          Notes
        </h2>
        {!editing && (
          <Button
            variant="link"
            className="h-auto p-0 font-semibold"
            aria-label={notes.length ? 'Edit notes' : undefined}
            onClick={() => setEditing(true)}
          >
            {notes.length ? 'Edit' : 'Add notes'}
          </Button>
        )}
      </div>

      {editing ? (
        <NotesEditor
          notes={notes}
          onCancel={() => setEditing(false)}
          onSave={async (drafts) => {
            await onSave(drafts)
            setEditing(false)
          }}
        />
      ) : notes.length === 0 ? (
        <p className="text-sm text-ink-3">No notes yet. Write down their pain, your angle and who decides.</p>
      ) : (
        <ul className="flex flex-col gap-3 text-sm text-foreground">
          {notes.map((note) => {
            const line = parseNote(note.body)
            if (line.kind === 'check') {
              const boxId = `${id}-${note.id}`
              return (
                <li key={note.id} className="flex items-start gap-2">
                  <input
                    id={boxId}
                    type="checkbox"
                    checked={line.done}
                    onChange={(e) => void toggle(note.id, e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-brand"
                  />
                  <label htmlFor={boxId} className={line.done ? 'text-ink-3 line-through' : undefined}>
                    {line.text}
                  </label>
                </li>
              )
            }
            return (
              <li key={note.id} className="leading-relaxed whitespace-pre-line">
                {line.label && <strong className="font-semibold">{line.label}: </strong>}
                {line.text}
              </li>
            )
          })}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-bad-tint p-3 text-[13px] text-bad">
          {error}
        </p>
      )}
    </section>
  )
}

function NotesEditor({
  notes,
  onSave,
  onCancel,
}: {
  notes: readonly Pick<ContactNote, 'id' | 'body'>[]
  onSave: (notes: NoteDraft[]) => Promise<void>
  onCancel: () => void
}) {
  const id = useId()
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<NotesFormValues>({
    resolver: zodResolver(notesFormSchema),
    defaultValues: { text: joinNotes(notes.map((n) => n.body)) },
  })

  // Move focus into the textarea when "Edit" opens it.
  useEffect(() => setFocus('text'), [setFocus])

  const save = handleSubmit(async ({ text }) => {
    try {
      await onSave(toDrafts(splitNotes(text), notes))
    } catch (e) {
      setError('root', { message: e instanceof Error ? e.message : 'Couldn’t save. Try again.' })
    }
  })

  const fieldError = errors.text?.message
  return (
    <form noValidate onSubmit={save} className="flex flex-col gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-text`} className="sr-only">
          Notes
        </Label>
        <Textarea
          id={`${id}-text`}
          rows={8}
          placeholder={'Pain: …\n\nAngle: …\n\n[ ] A to-do'}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={`${id}-hint${fieldError ? ` ${id}-error` : ''}`}
          {...register('text')}
        />
        <p id={`${id}-hint`} className="text-xs text-ink-3">
          Leave a blank line between notes. Start a line with [ ] for a to-do.
        </p>
        {fieldError && (
          <p id={`${id}-error`} className="text-xs text-bad">
            {fieldError}
          </p>
        )}
      </div>
      {errors.root?.message && (
        <p role="alert" className="rounded-lg bg-bad-tint p-3 text-[13px] text-bad">
          {errors.root.message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Check aria-hidden="true" />}
          Save notes
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
