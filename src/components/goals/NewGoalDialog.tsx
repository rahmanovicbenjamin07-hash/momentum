import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useId, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { addDays, getToday, type DateKey } from '@/lib/dates'
import {
  GOAL_UNIT_LABELS,
  GOAL_UNITS,
  newGoalFormSchema,
  type GoalUnit,
  type NewGoalFormInput,
  type NewGoalFormValues,
} from '@/schemas/goals'
import { GoalField, goalSelectClass } from './GoalField'

type NewGoalDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Creates the goal. Throw an Error to show its message. */
  onSubmit: (values: NewGoalFormValues) => Promise<void> | void
  /** The user's today (start defaults to it; deadline must be after it). Defaults to Sarajevo today. */
  today?: DateKey
}

const PLACEHOLDER: Record<GoalUnit, { start: string; target: string }> = {
  eur: { start: 'e.g. 3000', target: 'e.g. 10000' },
  bam: { start: 'e.g. 5000', target: 'e.g. 20000' },
  count: { start: 'e.g. 0', target: 'e.g. 200' },
  hours: { start: 'e.g. 0', target: 'e.g. 300' },
  km: { start: 'e.g. 0', target: 'e.g. 500' },
  days: { start: 'e.g. 0', target: 'e.g. 100' },
}

/** "New goal": any number you want to reach by a date. You update it yourself from the goal card. */
export function NewGoalDialog({ open, onOpenChange, onSubmit, today }: NewGoalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">New goal</DialogTitle>
          <DialogDescription>Pick a number, where you start and when you want to reach it. You update it yourself.</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so it starts empty every time. */}
        {open && <NewGoalForm onSubmit={onSubmit} onCancel={() => onOpenChange(false)} today={today ?? getToday()} />}
      </DialogContent>
    </Dialog>
  )
}

function NewGoalForm({
  onSubmit,
  onCancel,
  today,
}: Pick<NewGoalDialogProps, 'onSubmit'> & { onCancel: () => void; today: DateKey }) {
  const id = useId()
  const schema = useMemo(() => newGoalFormSchema(today), [today])
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NewGoalFormInput, unknown, NewGoalFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', short_label: '', unit: 'eur', start_value: '', target: '', start_date: today, deadline: '' },
  })
  const unit = useWatch({ control, name: 'unit' }) ?? 'eur'

  const save = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Couldn’t create the goal. Try again.' })
    }
  })

  const field = (name: keyof NewGoalFormInput) => ({
    'aria-invalid': errors[name] ? true : undefined,
    ...register(name),
  })

  return (
    <form noValidate onSubmit={save} className="flex flex-col gap-4">
      <GoalField id={`${id}-title`} label="Name" error={errors.title?.message}>
        {(describedBy) => (
          <Input
            id={`${id}-title`}
            placeholder="e.g. Have €10,000 saved by May"
            autoComplete="off"
            aria-describedby={describedBy}
            {...field('title')}
          />
        )}
      </GoalField>

      <div className="grid gap-4 sm:grid-cols-2">
        <GoalField
          id={`${id}-short`}
          label="Short label (optional)"
          hint="Shown on the goal chips."
          error={errors.short_label?.message}
        >
          {(describedBy) => (
            <Input id={`${id}-short`} placeholder="e.g. €10k saved" autoComplete="off" aria-describedby={describedBy} {...field('short_label')} />
          )}
        </GoalField>

        <GoalField id={`${id}-unit`} label="Unit" error={errors.unit?.message}>
          {(describedBy) => (
            <select id={`${id}-unit`} className={goalSelectClass} aria-describedby={describedBy} {...field('unit')}>
              {GOAL_UNITS.map((value) => (
                <option key={value} value={value}>
                  {GOAL_UNIT_LABELS[value]}
                </option>
              ))}
            </select>
          )}
        </GoalField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <GoalField id={`${id}-start`} label="Starting point" hint="Where you are now. Empty = 0." error={errors.start_value?.message}>
          {(describedBy) => (
            <Input
              id={`${id}-start`}
              inputMode="decimal"
              autoComplete="off"
              placeholder={PLACEHOLDER[unit].start}
              aria-describedby={describedBy}
              {...field('start_value')}
            />
          )}
        </GoalField>

        <GoalField id={`${id}-target`} label="Target" hint="The number you want to reach." error={errors.target?.message}>
          {(describedBy) => (
            <Input
              id={`${id}-target`}
              inputMode="decimal"
              autoComplete="off"
              placeholder={PLACEHOLDER[unit].target}
              aria-describedby={describedBy}
              {...field('target')}
            />
          )}
        </GoalField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <GoalField id={`${id}-from`} label="Start date" error={errors.start_date?.message}>
          {(describedBy) => (
            <Input id={`${id}-from`} type="date" max={today} aria-describedby={describedBy} {...field('start_date')} />
          )}
        </GoalField>

        <GoalField id={`${id}-deadline`} label="Deadline" error={errors.deadline?.message}>
          {(describedBy) => (
            <Input id={`${id}-deadline`} type="date" min={addDays(today, 1)} aria-describedby={describedBy} {...field('deadline')} />
          )}
        </GoalField>
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
