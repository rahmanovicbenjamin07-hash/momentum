import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useId } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  LOG_EVERY,
  LOG_EVERY_LABELS,
  newMetricFormSchema,
  UNIT_LABELS,
  UNITS,
  type NewMetricFormInput,
  type NewMetricFormValues,
} from '@/schemas/stats'

type NewMetricDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Creates the metric. Throw an Error to show its message. */
  onSubmit: (values: NewMetricFormValues) => Promise<void> | void
}

const DEFAULTS: NewMetricFormInput = { name: '', unit: 'count', log_every: 'monthly', yearly_goal: '' }

const GOAL_HINT = { eur: 'in €', count: 'a count', hours: 'in hours', km: 'in km', days: 'in days' } as const

const selectClass =
  'h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

/** "New metric": name, unit, how often you log it, and an optional yearly goal. */
export function NewMetricDialog({ open, onOpenChange, onSubmit }: NewMetricDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">New metric</DialogTitle>
          <DialogDescription>Anything you want to count over the year: money, trainings, hours, books…</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so it starts empty every time. */}
        {open && <NewMetricForm onSubmit={onSubmit} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function NewMetricForm({ onSubmit, onCancel }: { onSubmit: NewMetricDialogProps['onSubmit']; onCancel: () => void }) {
  const id = useId()
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NewMetricFormInput, unknown, NewMetricFormValues>({
    resolver: zodResolver(newMetricFormSchema),
    defaultValues: DEFAULTS,
  })
  const unit = useWatch({ control, name: 'unit' }) ?? 'count'
  const logEvery = useWatch({ control, name: 'log_every' })

  const save = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Couldn’t create the metric. Try again.' })
    }
  })

  const nameError = errors.name?.message
  const goalError = errors.yearly_goal?.message

  return (
    <form noValidate onSubmit={save} className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input
          id={`${id}-name`}
          placeholder="e.g. Trainings"
          autoComplete="off"
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? `${id}-name-error` : undefined}
          {...register('name')}
        />
        {nameError && (
          <p id={`${id}-name-error`} className="text-xs text-bad">
            {nameError}
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-unit`}>Unit</Label>
        <select id={`${id}-unit`} className={selectClass} {...register('unit')}>
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {UNIT_LABELS[u]}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-foreground">How often you log it</legend>
        <div className="flex w-fit rounded-lg border border-border bg-muted p-1">
          {LOG_EVERY.map((value) => (
            <label
              key={value}
              className={cn(
                'flex h-8 cursor-pointer items-center rounded-md px-3 text-sm font-medium has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                logEvery === value ? 'bg-card text-foreground' : 'text-ink-2 hover:text-foreground',
              )}
            >
              <input type="radio" value={value} className="sr-only" {...register('log_every')} />
              {LOG_EVERY_LABELS[value]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-goal`}>Yearly goal (optional)</Label>
        <Input
          id={`${id}-goal`}
          inputMode="decimal"
          autoComplete="off"
          placeholder={`e.g. ${unit === 'eur' ? '18000' : '150'}`}
          aria-invalid={goalError ? true : undefined}
          aria-describedby={`${id}-goal-hint${goalError ? ` ${id}-goal-error` : ''}`}
          {...register('yearly_goal')}
        />
        <p id={`${id}-goal-hint`} className="text-xs text-ink-2">
          The total you want by 31 December, {GOAL_HINT[unit]}.
        </p>
        {goalError && (
          <p id={`${id}-goal-error`} className="text-xs text-bad">
            {goalError}
          </p>
        )}
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
          Create metric
        </Button>
      </div>
    </form>
  )
}
