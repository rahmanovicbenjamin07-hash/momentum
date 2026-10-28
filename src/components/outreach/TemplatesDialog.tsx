import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { fillTemplate } from '@/lib/outreach'
import {
  CHANNEL_LABELS,
  CHANNELS,
  templateFormSchema,
  type Template,
  type TemplateFormInput,
  type TemplateFormValues,
} from '@/schemas/outreach'

export type TemplateItem = Pick<Template, 'id' | 'name' | 'channel' | 'body'>

type TemplatesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: readonly TemplateItem[]
  /** Saves a new template (no id) or changes one (with id). Throw an Error to show its message. */
  onSave: (values: TemplateFormValues, id?: string) => Promise<void> | void
  /** Name used in the preview, e.g. "Emir Kovač" → "Hi Emir,". */
  previewName?: string
}

type Mode = { kind: 'list' } | { kind: 'edit'; template?: TemplateItem }

const PLACEHOLDER = '{{first_name}}'

/** Message templates: list them, add or edit one, and preview it with a sample name. */
export function TemplatesDialog({ open, onOpenChange, templates, onSave, previewName = 'Emir Kovač' }: TemplatesDialogProps) {
  const [mode, setMode] = useState<Mode>({ kind: 'list' })

  function handleOpenChange(next: boolean) {
    if (!next) setMode({ kind: 'list' })
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-xl">
        {mode.kind === 'list' ? (
          <TemplateList templates={templates} onAdd={() => setMode({ kind: 'edit' })} onEdit={(t) => setMode({ kind: 'edit', template: t })} />
        ) : (
          <TemplateEditor
            key={mode.template?.id ?? 'new'}
            template={mode.template}
            previewName={previewName}
            onBack={() => setMode({ kind: 'list' })}
            onSave={async (values) => {
              await onSave(values, mode.template?.id)
              setMode({ kind: 'list' })
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function TemplateList({
  templates,
  onAdd,
  onEdit,
}: {
  templates: readonly TemplateItem[]
  onAdd: () => void
  onEdit: (template: TemplateItem) => void
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">Templates</DialogTitle>
        <DialogDescription>Reusable messages. {PLACEHOLDER} becomes the lead’s first name.</DialogDescription>
      </DialogHeader>

      {templates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-ink-2">
          No templates yet. Add your first message.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {templates.map((t) => (
            <li key={t.id} className="flex items-start gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                  {t.name}
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-ink-2">
                    {t.channel ? CHANNEL_LABELS[t.channel] : 'Any channel'}
                  </span>
                </p>
                <p className="mt-1 line-clamp-2 text-[13px] text-ink-2">{t.body}</p>
              </div>
              <Button variant="outline" size="sm" aria-label={`Edit ${t.name}`} onClick={() => onEdit(t)}>
                Edit
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button className="w-fit" onClick={onAdd}>
        <Plus aria-hidden="true" />
        New template
      </Button>
    </>
  )
}

function TemplateEditor({
  template,
  previewName,
  onBack,
  onSave,
}: {
  template?: TemplateItem
  previewName: string
  onBack: () => void
  onSave: (values: TemplateFormValues) => Promise<void>
}) {
  const id = useId()
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)
  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TemplateFormInput, unknown, TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: { name: template?.name ?? '', channel: template?.channel ?? '', body: template?.body ?? '' },
  })

  const { ref: bodyFieldRef, ...bodyField } = register('body')
  const preview = fillTemplate(useWatch({ control, name: 'body' }) ?? '', { name: previewName })

  /** Puts {{first_name}} where the cursor is. */
  function insertFirstName() {
    const el = bodyRef.current
    const body = getValues('body') ?? ''
    const start = el?.selectionStart ?? body.length
    const end = el?.selectionEnd ?? body.length
    setValue('body', body.slice(0, start) + PLACEHOLDER + body.slice(end), { shouldDirty: true })
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + PLACEHOLDER.length, start + PLACEHOLDER.length)
    })
  }

  const save = handleSubmit(async (values) => {
    try {
      await onSave(values)
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Couldn’t save the template. Try again.' })
    }
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">{template ? 'Edit template' : 'New template'}</DialogTitle>
        <DialogDescription>Write {PLACEHOLDER} where their first name should go.</DialogDescription>
      </DialogHeader>

      <form noValidate onSubmit={save} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid content-start gap-1.5">
            <Label htmlFor={`${id}-name`}>Name</Label>
            <Input
              id={`${id}-name`}
              placeholder="e.g. LinkedIn first message"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? `${id}-name-error` : undefined}
              {...register('name')}
            />
            {errors.name && (
              <p id={`${id}-name-error`} className="text-xs text-bad">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="grid content-start gap-1.5">
            <Label htmlFor={`${id}-channel`}>Channel</Label>
            <select
              id={`${id}-channel`}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...register('channel')}
            >
              <option value="">Any channel</option>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor={`${id}-body`}>Message</Label>
            <Button type="button" variant="outline" size="xs" onClick={insertFirstName}>
              Insert {PLACEHOLDER}
            </Button>
          </div>
          <Textarea
            id={`${id}-body`}
            rows={6}
            className="min-h-32 bg-card"
            placeholder={`Hi ${PLACEHOLDER}, …`}
            aria-invalid={errors.body ? true : undefined}
            aria-describedby={`${id}-body-hint${errors.body ? ` ${id}-body-error` : ''}`}
            ref={(el) => {
              bodyRef.current = el
              bodyFieldRef(el)
            }}
            {...bodyField}
          />
          <p id={`${id}-body-hint`} className="text-xs text-ink-2">
            {PLACEHOLDER} becomes the first name, or “there” when there’s no name.
          </p>
          {errors.body && (
            <p id={`${id}-body-error`} className="text-xs text-bad">
              {errors.body.message}
            </p>
          )}
        </div>

        <section aria-labelledby={`${id}-preview`} className="rounded-lg bg-background p-3">
          <h3 id={`${id}-preview`} className="mb-1 text-xs font-semibold tracking-wider text-ink-2 uppercase">
            Preview for {previewName}
          </h3>
          <p className="text-sm whitespace-pre-wrap text-foreground">{preview || <span className="text-ink-3">Nothing written yet.</span>}</p>
        </section>

        {errors.root?.message && (
          <p role="alert" className="rounded-lg bg-bad-tint p-3 text-[13px] text-bad">
            {errors.root.message}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
            Save template
          </Button>
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            Back
          </Button>
        </div>
      </form>
    </>
  )
}
