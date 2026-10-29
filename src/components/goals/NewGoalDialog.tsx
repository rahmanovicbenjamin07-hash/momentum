import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useId, useMemo, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addDays, type DateKey } from '@/lib/dates'
import {
  GOAL_TYPES,
  newGoalFormSchema,
  type GoalType,
  type NewGoalFormInput,
  type NewGoalFormValues,
  type SourceKind,
} from '@/schemas/goals'
import type { Unit } from '@/schemas/stats'

/** Something a goal can be measured on: one of My metrics, or a routine item. */
export type GoalSource = { kind: SourceKind; id: string; name: string; unit: Unit }

type NewGoalDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sources: GoalSource[]
  /** Creates the goal. Throw an Error to show its message. */
  onSubmit: (values: NewGoalFormValues) => Promise<void> | void
  /** The user's today (for "deadline after today"). Defaults to Sarajevo today. */
  today?: DateKey
}

const TYPE_LABELS: Record<GoalType, string> = {
  total: 'Reach a total by a date',
  level: 'Reach a monthly level',
}

const UNIT_HINT: Record<Unit, string> = { eur: 'in €', count: 'a count', hours: 'in hours', km: 'in km', days: 'in days' }

const DEFAULTS: NewGoalFormInput = {
  title: '',
  short_label: '',
  type: 'total',
  source_kind: 'metric',
  source_id: '',
  target: '',
  deadline: '',
}

const selectClass =
  'h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-bad'

/** "New goal": name, short label, what it's measured on, type, target and deadline. */
export function NewGoalDialog({ open, onOpenChange, sources, onSubmit, today }: NewGoalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">New goal</DialogTitle>
          <DialogDescription>Pick something you already track and say where you want it to be.</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so it starts empty every time. */}
        {open && <NewGoalForm sources={sources} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} today={today} />}
      </DialogContent>
    </Dialog>
  )
}

/** Label + control + optional hint and error, wired up with ids. */
function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: ReactNode
  error?: string
  children: (describedBy: string | undefined) => ReactNode
}) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children(describedBy)}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-ink-2">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-bad">
          {error}
        </p>
      )}
    </div>
  )
}

function NewGoalForm({
  sources,
  onSubmit,
  onCancel,
  today,
}: Pick<NewGoalDialogProps, 'sources' | 'onSubmit' | 'today'> & { onCancel: () => void }) {
  const id = useId()
  const schema = useMemo(() => newGoalFormSchema(today), [today])
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<NewGoalFormInput, unknown, NewGoalFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  })
  const sourceKind = useWatch({ control, name: 'source_kind' })
  const sourceId = useWatch({ control, name: 'source_id' })
  const type = useWatch({ control, name: 'type' }) ?? 'total'
  const source = sources.find((s) => s.kind === sourceKind && s.id === sourceId)
  const metrics = sources.filter((s) => s.kind === 'metric')
  const routines = sources.filter((s) => s.kind === 'routine')

  const save = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Couldn’t create the goal. Try again.' })
    }
  })

  const unitHint = source ? UNIT_HINT[source.unit] : null
  const targetHint =
    type === 'total'
      ? `The total you want by the deadline${unitHint ? `, ${unitHint}` : ''}.`
      : `What you want in a single month${unitHint ? `, ${unitHint}` : ''}.`

  return (
    <form noValidate onSubmit={save} className="flex flex-col gap-4">
      <Field id={`${id}-title`} label="Name" error={errors.title?.message}>
        {(describedBy) => (
          <Input
            id={`${id}-title`}
            placeholder="e.g. Earn €18,000 in 2026"
            autoComplete="off"
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={describedBy}
            {...register('title')}
          />
        )}
      </Field>

      <Field
        id={`${id}-short`}
        label="Short label"
        hint="Shown on the goal chips at the top."
        error={errors.short_label?.message}
      >
        {(describedBy) => (
          <Input
            id={`${id}-short`}
            placeholder="e.g. €18k in 2026"
            autoComplete="off"
            aria-invalid={errors.short_label ? true : undefined}
            aria-describedby={describedBy}
            {...register('short_label')}
          />
        )}
      </Field>

      <Field
        id={`${id}-source`}
        label="Measured by"
        hint={sources.length === 0 ? 'Add a metric or a routine item first.' : undefined}
        error={errors.source_id?.message}
      >
        {(describedBy) => (
          <select
            id={`${id}-source`}
            className={selectClass}
            value={source ? `${source.kind}:${source.id}` : ''}
            aria-invalid={errors.source_id ? true : undefined}
            aria-describedby={describedBy}
            onChange={(e) => {
              const [kind, ...rest] = e.target.value.split(':')
              setValue('source_kind', (kind as SourceKind) || 'metric')
              setValue('source_id', rest.join(':'), { shouldValidate: isSubmitted })
            }}
          >
            <option value="">Choose…</option>
            {metrics.length > 0 && (
              <optgroup label="My metrics">
                {metrics.map((s) => (
                  <option key={s.id} value={`metric:${s.id}`}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            )}
            {routines.length > 0 && (
              <optgroup label="Routine items">
                {routines.map((s) => (
                  <option key={s.id} value={`routine:${s.id}`}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        )}
      </Field>

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-foreground">Type</legend>
        <div className="flex w-fit flex-wrap rounded-lg border border-border bg-muted p-1">
          {GOAL_TYPES.map((value) => (
            <label
              key={value}
              className={cn(
                'flex h-8 cursor-pointer items-center rounded-md px-3 text-sm font-medium has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                type === value ? 'bg-card text-foreground' : 'text-ink-2 hover:text-foreground',
              )}
            >
              <input type="radio" value={value} className="sr-only" {...register('type')} />
              {TYPE_LABELS[value]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-target`} label="Target" hint={targetHint} error={errors.target?.message}>
          {(describedBy) => (
            <Input
              id={`${id}-target`}
              inputMode="decimal"
              autoComplete="off"
              placeholder={source?.unit === 'eur' ? 'e.g. 18000' : 'e.g. 150'}
              aria-invalid={errors.target ? true : undefined}
              aria-describedby={describedBy}
              {...register('target')}
            />
          )}
        </Field>

        <Field id={`${id}-deadline`} label="Deadline" error={errors.deadline?.message}>
          {(describedBy) => (
            <Input
              id={`${id}-deadline`}
              type="date"
              min={today ? addDays(today, 1) : undefined}
              aria-invalid={errors.deadline ? true : undefined}
              aria-describedby={describedBy}
              {...register('deadline')}
            />
          )}
        </Field>
      </div>

      {errors.root?.message && (
        <p role="alert" className="rounded-lg bg-bad-tint p-3 text-[13px] text-bad">
          {errors.root.message}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
          Create goal
        </Button>
      </div>
    </form>
  )
}
