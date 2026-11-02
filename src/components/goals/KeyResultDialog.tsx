import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { DateKey } from '@/lib/dates'
import { keyResultFormSchema, type KeyResultFormInput, type KeyResultFormValues } from '@/schemas/goals'
import { KeyResultFields } from './KeyResultFields'
import { keyResultDefaults } from './meta'

type KeyResultDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  goalTitle: string
  routineItems?: readonly { id: string; title: string }[]
  today: DateKey
  /** Adds the key result. Throw an Error to show its message. */
  onSubmit: (values: KeyResultFormValues) => Promise<void> | void
}

/** "Add key result": another way to measure a goal (a number, steps, a habit or done / not done). */
export function KeyResultDialog({ open, onOpenChange, goalTitle, routineItems = [], today, onSubmit }: KeyResultDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-form max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Add key result</DialogTitle>
          <DialogDescription>{goalTitle}</DialogDescription>
        </DialogHeader>
        {open && <KeyResultForm onSubmit={onSubmit} onCancel={() => onOpenChange(false)} routineItems={routineItems} today={today} />}
      </DialogContent>
    </Dialog>
  )
}

function KeyResultForm({
  onSubmit,
  onCancel,
  routineItems,
  today,
}: Pick<KeyResultDialogProps, 'onSubmit' | 'today'> & { onCancel: () => void; routineItems: readonly { id: string; title: string }[] }) {
  const schema = useMemo(() => keyResultFormSchema(today), [today])
  const form = useForm<KeyResultFormInput, unknown, KeyResultFormValues>({
    resolver: zodResolver(schema),
    defaultValues: keyResultDefaults(today),
  })
  const {
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form

  const save = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Couldn’t add the key result. Try again.' })
    }
  })

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={save} className="flex flex-col gap-4">
        <KeyResultFields today={today} routineItems={routineItems} />
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
            Add key result
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
