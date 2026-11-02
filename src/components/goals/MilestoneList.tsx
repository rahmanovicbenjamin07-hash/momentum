import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate, type DateKey } from '@/lib/dates'
import {
  GOAL_LIMITS,
  milestoneFormSchema,
  type MilestoneFormInput,
  type MilestoneFormValues,
} from '@/schemas/goals'

export type MilestoneItem = { id: string; title: string; due_date: DateKey | null; done_on: DateKey | null }

type MilestoneListProps = {
  /** In order. */
  milestones: readonly MilestoneItem[]
  today: DateKey
  onToggle: (id: string, done: boolean) => void
  onDelete: (id: string) => void
  /** Adds a step at the end. Throw an Error to show its message. */
  onAdd: (values: MilestoneFormValues) => Promise<void> | void
}

/** The steps of a key result: tick them off, see what's overdue, add or delete steps. */
export function MilestoneList({ milestones, today, onToggle, onDelete, onAdd }: MilestoneListProps) {
  const id = useId()
  const full = milestones.length >= GOAL_LIMITS.milestones

  return (
    <div className="flex flex-col gap-3">
      {milestones.length === 0 ? (
        <p className="text-[13px] text-ink-2">No steps yet. Add the first one below.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {milestones.map((step) => {
            const done = step.done_on !== null
            const overdue = !done && step.due_date !== null && step.due_date < today
            const boxId = `${id}-${step.id}`
            return (
              <li key={step.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <Checkbox id={boxId} checked={done} onCheckedChange={(checked) => onToggle(step.id, checked === true)} />
                <Label
                  htmlFor={boxId}
                  className={cn('min-w-0 flex-1 font-normal break-words', done ? 'text-ink-2 line-through' : 'text-foreground')}
                >
                  {step.title}
                </Label>
                {done ? (
                  <span className="shrink-0 text-xs text-ink-2 tabular-nums">Done {formatDate(step.done_on ?? today)}</span>
                ) : (
                  step.due_date && (
                    <span className={cn('shrink-0 text-xs tabular-nums', overdue ? 'font-semibold text-bad' : 'text-ink-2')}>
                      {overdue ? 'Overdue · ' : 'Due '}
                      {formatDate(step.due_date)}
                    </span>
                  )
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-ink-3 hover:text-bad"
                  aria-label={`Delete step ${step.title}`}
                  onClick={() => onDelete(step.id)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      {full ? (
        <p className="text-xs text-ink-2">That’s the most steps one key result can have ({GOAL_LIMITS.milestones}).</p>
      ) : (
        <AddStepForm onAdd={onAdd} />
      )}
    </div>
  )
}

function AddStepForm({ onAdd }: Pick<MilestoneListProps, 'onAdd'>) {
  const id = useId()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MilestoneFormInput, unknown, MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: { title: '', due_date: '' },
  })

  const save = handleSubmit(async (values) => {
    try {
      await onAdd(values)
      reset()
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Couldn’t add the step. Try again.' })
    }
  })
  const error = errors.title?.message ?? errors.due_date?.message ?? errors.root?.message

  return (
    <form noValidate onSubmit={save} className="flex flex-wrap items-end gap-2">
      <div className="grid min-w-40 flex-1 gap-1.5">
        <Label htmlFor={`${id}-title`}>New step</Label>
        <Input
          id={`${id}-title`}
          autoComplete="off"
          maxLength={GOAL_LIMITS.milestoneTitle}
          placeholder="e.g. Write the homepage copy"
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...register('title')}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-due`}>Due (optional)</Label>
        <Input id={`${id}-due`} type="date" className="w-40" {...register('due_date')} />
      </div>
      <Button type="submit" variant="outline" disabled={isSubmitting}>
        <Plus aria-hidden="true" />
        Add step
      </Button>
      {error && (
        <p id={`${id}-error`} className="w-full text-xs text-bad">
          {error}
        </p>
      )}
    </form>
  )
}
