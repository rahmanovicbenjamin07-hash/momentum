import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useId, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TimeInput } from '@/components/ui/time-input'
import type { DateKey } from '@/lib/dates'
import { formatRepeatDays, tagLabel, WEEKDAY_LETTERS, WEEKDAY_NAMES } from '@/lib/today-list'
import {
  editItemFormSchema,
  itemStatus,
  type EditItemFormInput,
  type EditItemFormValues,
  type Priority,
  type TodayItem,
  type TodayItemStatus,
} from '@/schemas/today'

/**
 * What the pop-up hands back: a one-off task's name, day and time, or a repeating item's name, days and time.
 * `notes` (the description) and `endTime` (end of a range) are only there when they changed; null clears them.
 */
export type EditTaskResult =
  | {
      kind: 'task'
      id: string
      title: string
      notes?: string | null
      time: string | null
      endTime?: string | null
      dueDate: DateKey
    }
  | {
      kind: 'routine'
      id: string
      title: string
      notes?: string | null
      time: string | null
      endTime?: string | null
      days: boolean[]
    }

type EditTaskDialogProps = {
  /** The item being shown; null = closed. */
  item: TodayItem | null
  /** The day the item is shown on (a one-off task's due date). */
  date: DateKey
  onOpenChange: (open: boolean) => void
  /** Throw an Error to show its message and keep the pop-up open. */
  onSubmit: (result: EditTaskResult) => void | Promise<void>
}

const EVERY_DAY = [true, true, true, true, true, true, true]

const STATUS: Record<TodayItemStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-info-tint text-info' },
  done: { label: 'Done', className: 'bg-good-tint text-good' },
  missed: { label: 'Not done', className: 'bg-bad-tint text-bad' },
}

const PRIORITY: Record<Priority, string> = { high: 'High priority', medium: 'Medium priority', low: 'Low priority' }

const chip = 'inline-flex h-6 items-center rounded-lg px-2 text-xs font-medium whitespace-nowrap'

/** Task pop-up (click a task or its pencil): status and info at the top, then name, description, day / days and time. */
export function EditTaskDialog({ item, date, onOpenChange, onSubmit }: EditTaskDialogProps) {
  // No built-in trigger, so remember what opened it (the task or its pencil) and go back to it on close.
  const returnFocus = useRef<HTMLElement | null>(null)
  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-md"
        onOpenAutoFocus={() => {
          returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        }}
        onCloseAutoFocus={(event) => {
          const target = returnFocus.current
          if (target?.isConnected) {
            event.preventDefault()
            target.focus()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{item?.kind === 'routine' ? 'Repeating task' : 'Task'}</DialogTitle>
          <DialogDescription>
            {item?.kind === 'routine' ? 'Changes apply to every day it repeats.' : 'Change anything and save.'}
          </DialogDescription>
        </DialogHeader>
        {/* Keyed by item, so it starts fresh for each one. */}
        {item && (
          <EditTaskForm
            key={`${item.kind}-${item.id}`}
            item={item}
            date={date}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ItemInfo({ item }: { item: TodayItem }) {
  const status = STATUS[itemStatus(item)]
  return (
    <ul aria-label="Details" className="flex flex-wrap gap-1.5">
      <li className={cn(chip, status.className)}>{status.label}</li>
      {item.kind === 'routine' ? (
        <li className={cn(chip, 'bg-brand-tint text-brand')}>Repeats · {formatRepeatDays(item.days ?? [])}</li>
      ) : (
        <>
          {item.tag && <li className={cn(chip, 'bg-muted text-ink-2')}>#{tagLabel(item.tag)}</li>}
          {item.priority && <li className={cn(chip, 'bg-muted text-ink-2')}>{PRIORITY[item.priority]}</li>}
        </>
      )}
    </ul>
  )
}

function EditTaskForm({
  item,
  date,
  onSubmit,
  onCancel,
}: { item: TodayItem; date: DateKey; onSubmit: EditTaskDialogProps['onSubmit']; onCancel: () => void }) {
  const id = useId()
  const isRoutine = item.kind === 'routine'
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditItemFormInput, unknown, EditItemFormValues>({
    resolver: zodResolver(editItemFormSchema),
    defaultValues: {
      title: item.title,
      notes: item.notes ?? '',
      time: item.time ?? '',
      endTime: item.endTime ?? '',
      date,
      days: item.days ?? EVERY_DAY,
    },
  })
  const days = useWatch({ control, name: 'days' }) ?? EVERY_DAY

  const save = handleSubmit(async (values) => {
    // Only send the description and end time when they changed.
    const changed = {
      ...(values.notes === (item.notes ?? null) ? {} : { notes: values.notes }),
      ...(values.endTime === (item.endTime ?? null) ? {} : { endTime: values.endTime }),
    }
    const result: EditTaskResult = isRoutine
      ? { kind: 'routine', id: item.id, title: values.title, ...changed, time: values.time, days: values.days }
      : { kind: 'task', id: item.id, title: values.title, ...changed, time: values.time, dueDate: values.date }
    try {
      await onSubmit(result)
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : "Couldn't save the change. Try again." })
    }
  })

  const timeError = errors.time?.message ?? errors.endTime?.message

  return (
    <form noValidate onSubmit={save} className="flex flex-col gap-4">
      <ItemInfo item={item} />

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-title`}>Name</Label>
        <Input
          id={`${id}-title`}
          autoComplete="off"
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? `${id}-title-error` : undefined}
          {...register('title')}
        />
        {errors.title && (
          <p id={`${id}-title-error`} className="text-xs text-bad">
            {errors.title.message}
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-notes`}>Description</Label>
        <Textarea
          id={`${id}-notes`}
          rows={4}
          placeholder="Details, links, what “done” looks like…"
          aria-invalid={errors.notes ? true : undefined}
          aria-describedby={errors.notes ? `${id}-notes-error` : undefined}
          {...register('notes')}
        />
        {errors.notes && (
          <p id={`${id}-notes-error`} className="text-xs text-bad">
            {errors.notes.message}
          </p>
        )}
      </div>

      {!isRoutine && (
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-date`}>Day</Label>
          <Input id={`${id}-date`} type="date" aria-invalid={errors.date ? true : undefined} {...register('date')} />
          {errors.date && <p className="text-xs text-bad">{errors.date.message}</p>}
        </div>
      )}

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Time</legend>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid min-w-28 flex-1 gap-1">
            <Label htmlFor={`${id}-time`} className="text-[13px] font-normal text-ink-2">
              From
            </Label>
            <TimeInput
              id={`${id}-time`}
              aria-invalid={errors.time ? true : undefined}
              aria-describedby={timeError ? `${id}-time-error` : undefined}
              {...register('time')}
            />
          </div>
          <div className="grid min-w-28 flex-1 gap-1">
            <Label htmlFor={`${id}-end`} className="text-[13px] font-normal text-ink-2">
              Until (optional)
            </Label>
            <TimeInput
              id={`${id}-end`}
              aria-invalid={errors.endTime ? true : undefined}
              aria-describedby={timeError ? `${id}-time-error` : undefined}
              {...register('endTime')}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => {
              setValue('time', '', { shouldDirty: true })
              setValue('endTime', '', { shouldDirty: true })
            }}
          >
            Anytime
          </Button>
        </div>
        {timeError && (
          <p id={`${id}-time-error`} className="text-xs text-bad">
            {timeError}
          </p>
        )}
      </fieldset>

      {isRoutine && (
        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">Repeats on</legend>
          <div className="flex flex-wrap gap-1">
            {WEEKDAY_LETTERS.map((letter, i) => {
              const on = days[i] === true
              return (
                <button
                  key={WEEKDAY_NAMES[i]}
                  type="button"
                  aria-pressed={on}
                  aria-label={WEEKDAY_NAMES[i]}
                  onClick={() =>
                    setValue(
                      'days',
                      days.map((d, j) => (j === i ? !d : d)),
                      { shouldDirty: true, shouldValidate: true },
                    )
                  }
                  className={cn(
                    'grid size-9 place-items-center rounded-lg border text-xs font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    on ? 'border-brand bg-brand text-white hover:bg-brand/90' : 'border-border bg-card text-foreground hover:bg-muted',
                  )}
                >
                  {letter}
                </button>
              )
            })}
          </div>
          {errors.days && <p className="text-xs text-bad">{errors.days.message ?? errors.days.root?.message}</p>}
        </fieldset>
      )}

      {errors.root && (
        <p role="alert" className="text-sm text-bad">
          {errors.root.message}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Save
        </Button>
      </div>
    </form>
  )
}
