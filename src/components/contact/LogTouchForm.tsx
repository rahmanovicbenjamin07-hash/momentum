import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Loader2 } from 'lucide-react'
import { useId, useImperativeHandle, type ReactNode, type Ref } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { TemplateItem } from '@/components/outreach/TemplatesDialog'
import { fillTemplate, SENT_TOUCH_FOLLOW_UP_DAYS } from '@/lib/outreach'
import {
  CHANNEL_LABELS,
  CHANNELS,
  logTouchFormSchema,
  type Channel,
  type Direction,
  type LogTouchFormInput,
  type LogTouchFormValues,
} from '@/schemas/outreach'

/** Lets the page focus the form from "Log touch" and "Use template" in the summary. */
export type LogTouchFormHandle = {
  focusMessage: () => void
  focusTemplate: () => void
}

type LogTouchFormProps = {
  /** Lead's name, to fill {{first_name}} in templates. */
  contactName: string
  /** Pre-selected channel, usually the lead's channel. */
  defaultChannel?: Channel | null
  templates: readonly TemplateItem[]
  /** Saves the touch. Received touches come with `got_reply: true`. Throw an Error to show its message. */
  onSubmit: (values: LogTouchFormValues) => Promise<void> | void
  ref?: Ref<LogTouchFormHandle>
}

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: 'sent', label: 'Sent' },
  { value: 'received', label: 'Received' },
  { value: 'note', label: 'Note' },
]

const HINTS: Record<Direction, string> = {
  sent: `Saving a sent touch sets the next follow-up ${SENT_TOUCH_FOLLOW_UP_DAYS} days out.`,
  received: 'Saved with a “Reply received” badge on the timeline.',
  note: 'A note for yourself, e.g. a call summary. It doesn’t change the follow-up.',
}

const PLACEHOLDERS: Record<Direction, string> = {
  sent: 'Paste the message you sent, or summarise the call',
  received: 'Paste what they wrote back',
  note: 'Write the note',
}

/** Select with its label inside the box, like "Channel  LinkedIn ▾". */
function InlineSelect({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="relative flex h-10 items-center rounded-lg border border-input bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <label htmlFor={id} className="pl-3 text-sm text-ink-2">
        {label}
      </label>
      {children}
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 size-4 text-ink-2" />
    </div>
  )
}

const selectClass =
  'h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-9 pl-2 text-sm font-medium text-foreground outline-none'

/** "Log a touch": channel, Sent / Received / Note, optional template, message. */
export function LogTouchForm({ contactName, defaultChannel, templates, onSubmit, ref }: LogTouchFormProps) {
  const id = useId()
  const initialChannel: Channel = defaultChannel ?? 'email'

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setFocus,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LogTouchFormInput, unknown, LogTouchFormValues>({
    resolver: zodResolver(logTouchFormSchema),
    defaultValues: { channel: initialChannel, direction: 'sent', template_id: '', body: '', got_reply: false },
  })

  useImperativeHandle(ref, () => ({
    focusMessage: () => setFocus('body'),
    focusTemplate: () => setFocus('template_id'),
  }))

  const channel = useWatch({ control, name: 'channel' })
  const direction = useWatch({ control, name: 'direction' })
  const templateId = useWatch({ control, name: 'template_id' })
  const fitting = templates.filter((t) => t.channel === null || t.channel === channel || t.id === templateId)

  const templateField = register('template_id', {
    onChange: (e: { target: { value: string } }) => {
      const template = templates.find((t) => t.id === e.target.value)
      if (template) setValue('body', fillTemplate(template.body, { name: contactName }), { shouldValidate: false })
    },
  })

  const save = handleSubmit(async (values) => {
    try {
      await onSubmit({ ...values, got_reply: values.direction === 'received' })
      reset({ channel: values.channel, direction: 'sent', template_id: '', body: '', got_reply: false })
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Couldn’t save the touch. Try again.' })
    }
  })

  const bodyError = errors.body?.message
  const current: Direction = direction ?? 'sent'

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <h2 id={`${id}-title`} className="mb-3 text-base font-semibold text-foreground">
        Log a touch
      </h2>

      <form noValidate onSubmit={save} className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <InlineSelect id={`${id}-channel`} label="Channel">
            <select id={`${id}-channel`} className={selectClass} {...register('channel')}>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </select>
          </InlineSelect>

          <fieldset className="flex h-10 rounded-lg border border-border bg-muted p-1">
            <legend className="sr-only">Direction</legend>
            {DIRECTIONS.map(({ value, label }) => (
              <label
                key={value}
                className={cn(
                  'flex cursor-pointer items-center rounded-md px-3 text-sm font-medium has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                  current === value ? 'bg-card text-foreground' : 'text-ink-2 hover:text-foreground',
                )}
              >
                <input type="radio" value={value} className="sr-only" {...register('direction')} />
                {label}
              </label>
            ))}
          </fieldset>

          <InlineSelect id={`${id}-template`} label="Template">
            <select id={`${id}-template`} className={cn(selectClass, 'min-w-28')} {...templateField}>
              <option value="">None</option>
              {fitting.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </InlineSelect>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-body`}>{current === 'note' ? 'Note' : 'Message or summary'}</Label>
          <Textarea
            id={`${id}-body`}
            rows={3}
            placeholder={PLACEHOLDERS[current]}
            aria-invalid={bodyError ? true : undefined}
            aria-describedby={bodyError ? `${id}-body-error` : undefined}
            {...register('body')}
          />
          {bodyError && (
            <p id={`${id}-body-error`} className="text-xs text-bad">
              {bodyError}
            </p>
          )}
        </div>

        {errors.root?.message && (
          <p role="alert" className="rounded-lg bg-bad-tint p-3 text-[13px] text-bad">
            {errors.root.message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-ink-2">{HINTS[current]}</p>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
            Save touch
          </Button>
        </div>
      </form>
    </section>
  )
}
