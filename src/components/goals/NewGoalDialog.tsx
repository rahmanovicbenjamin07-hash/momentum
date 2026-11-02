import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useId, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getToday, type DateKey } from '@/lib/dates'
import {
  GOAL_LIMITS,
  newObjectiveFormSchema,
  type NewObjectiveFormInput,
  type NewObjectiveFormValues,
} from '@/schemas/goals'
import { GoalField } from './GoalField'
import { KeyResultFields } from './KeyResultFields'
import { keyResultDefaults } from './meta'

type NewGoalDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Creates the goal and its first key result. Throw an Error to show its message. */
  onSubmit: (values: NewObjectiveFormValues) => Promise<void> | void
  /** Routine items a habit can be linked to. */
  routineItems?: readonly { id: string; title: string }[]
  /** The user's today (start defaults to it; deadline must be after it). Defaults to Sarajevo today. */
  today?: DateKey
}

/** "New goal": the goal's name and the first way to measure it (more can be added later). */
export function NewGoalDialog({ open, onOpenChange, onSubmit, routineItems = [], today }: NewGoalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-form max-h-[92dvh] overflow-y-auto sm:max-w-2xl sm:gap-5 sm:p-7">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">New goal</DialogTitle>
          <DialogDescription className="sr-only">Name the goal and how you’ll measure it.</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so it starts empty every time. */}
        {open && (
          <NewGoalForm onSubmit={onSubmit} onCancel={() => onOpenChange(false)} routineItems={routineItems} today={today ?? getToday()} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function NewGoalForm({
  onSubmit,
  onCancel,
  routineItems,
  today,
}: Pick<NewGoalDialogProps, 'onSubmit'> & { onCancel: () => void; routineItems: readonly { id: string; title: string }[]; today: DateKey }) {
  const id = useId()
  const schema = useMemo(() => newObjectiveFormSchema(today), [today])
  const form = useForm<NewObjectiveFormInput, unknown, NewObjectiveFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', why: '', ...keyResultDefaults(today) },
  })
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form

  const save = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Couldn’t create the goal. Try again.' })
    }
  })

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={save} className="flex flex-col gap-4">
        <GoalField floating id={`${id}-title`} label="Goal" error={errors.title?.message}>
          {(describedBy) => (
            <Input
              id={`${id}-title`}
              placeholder=" "
              autoComplete="off"
              maxLength={GOAL_LIMITS.title}
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={describedBy}
              {...register('title')}
            />
          )}
        </GoalField>

        <div className="border-t border-border pt-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">First key result</h3>
          <KeyResultFields today={today} routineItems={routineItems} titleOptional />
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
    </FormProvider>
  )
}
