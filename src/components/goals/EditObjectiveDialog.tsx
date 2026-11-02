import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { GOAL_LIMITS, objectiveFormSchema, type ObjectiveFormInput, type ObjectiveFormValues } from '@/schemas/goals'
import { GoalField } from './GoalField'

type EditObjectiveDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  why: string | null
  /** Saves the changes. Throw an Error to show its message. */
  onSubmit: (values: ObjectiveFormValues) => Promise<void> | void
}

/** "Edit goal": rename it, or change why it matters. */
export function EditObjectiveDialog({ open, onOpenChange, title, why, onSubmit }: EditObjectiveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Edit goal</DialogTitle>
        </DialogHeader>
        {open && <EditObjectiveForm title={title} why={why} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function EditObjectiveForm({
  title,
  why,
  onSubmit,
  onCancel,
}: Pick<EditObjectiveDialogProps, 'title' | 'why' | 'onSubmit'> & { onCancel: () => void }) {
  const id = useId()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ObjectiveFormInput, unknown, ObjectiveFormValues>({
    resolver: zodResolver(objectiveFormSchema),
    defaultValues: { title, why: why ?? '' },
  })

  const save = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Couldn’t save the goal. Try again.' })
    }
  })

  return (
    <form noValidate onSubmit={save} className="flex flex-col gap-4">
      <GoalField id={`${id}-title`} label="Goal" error={errors.title?.message}>
        {(describedBy) => (
          <Input
            id={`${id}-title`}
            autoComplete="off"
            maxLength={GOAL_LIMITS.title}
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={describedBy}
            {...register('title')}
          />
        )}
      </GoalField>
      <GoalField id={`${id}-why`} label="Why it matters (optional)" error={errors.why?.message}>
        {(describedBy) => (
          <Textarea
            id={`${id}-why`}
            maxLength={GOAL_LIMITS.why}
            aria-invalid={errors.why ? true : undefined}
            aria-describedby={describedBy}
            {...register('why')}
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
          Save
        </Button>
      </div>
    </form>
  )
}
