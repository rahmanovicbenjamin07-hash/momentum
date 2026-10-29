import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useId, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatDate, type DateKey } from '@/lib/dates'
import { formatGoalValue } from '@/lib/goalChart'
import {
  GOAL_LIMITS,
  goalUpdateFormSchema,
  type GoalUnit,
  type GoalUpdateFormInput,
  type GoalUpdateFormValues,
} from '@/schemas/goals'
import { GoalField } from './GoalField'

type GoalUpdateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  goalTitle: string
  unit: GoalUnit
  /** Where the goal stands now, shown as a hint. */
  current: number
  /** Updates can't be before the goal's start. */
  startDate: DateKey
  today: DateKey
  /** Saves the value. Throw an Error to show its message. */
  onSubmit: (values: GoalUpdateFormValues) => Promise<void> | void
}

/** "Update goal": where the goal stands on a day (today by default). Same day again replaces the value. */
export function GoalUpdateDialog({ open, onOpenChange, goalTitle, ...form }: GoalUpdateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Update goal</DialogTitle>
          <DialogDescription>{goalTitle}</DialogDescription>
        </DialogHeader>
        {open && <GoalUpdateForm {...form} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function GoalUpdateForm({
  unit,
  current,
  startDate,
  today,
  onSubmit,
  onCancel,
}: Omit<GoalUpdateDialogProps, 'open' | 'onOpenChange' | 'goalTitle'> & { onCancel: () => void }) {
  const id = useId()
  const schema = useMemo(() => goalUpdateFormSchema(startDate, today), [startDate, today])
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<GoalUpdateFormInput, unknown, GoalUpdateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { value: '', date: today, note: '' },
  })

  const save = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Couldn’t save the update. Try again.' })
    }
  })

  return (
    <form noValidate onSubmit={save} className="flex flex-col gap-4">
      <GoalField
        id={`${id}-value`}
        label="Current number"
        hint={`Where the goal stands now. Last: ${formatGoalValue(current, unit)}.`}
        error={errors.value?.message}
      >
        {(describedBy) => (
          <Input
            id={`${id}-value`}
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={errors.value ? true : undefined}
            aria-describedby={describedBy}
            {...register('value')}
          />
        )}
      </GoalField>

      <GoalField
        id={`${id}-date`}
        label="Date"
        hint={`From ${formatDate(startDate)} to today. Same day again replaces it.`}
        error={errors.date?.message}
      >
        {(describedBy) => (
          <Input
            id={`${id}-date`}
            type="date"
            min={startDate}
            max={today}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={describedBy}
            {...register('date')}
          />
        )}
      </GoalField>

      <GoalField id={`${id}-note`} label="Note (optional)" error={errors.note?.message}>
        {(describedBy) => (
          <Input
            id={`${id}-note`}
            autoComplete="off"
            maxLength={GOAL_LIMITS.note}
            placeholder="e.g. Salary + client payment"
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={describedBy}
            {...register('note')}
          />
        )}
      </GoalField>

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
          Save update
        </Button>
      </div>
    </form>
  )
}
