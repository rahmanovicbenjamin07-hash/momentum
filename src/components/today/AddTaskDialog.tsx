import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Loader2 } from 'lucide-react'
import { useId, useMemo, useRef, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { dayIndex, getToday, type DateKey } from '@/lib/dates'
import { buildQuickAdd, defaultQuickAddDay, quickAddDueDate, type QuickAddResult } from '@/lib/quickAddSubmit'
import {
  quickAddFormSchema,
  type QuickAddDay,
  type QuickAddFormInput,
  type QuickAddFormValues,
  type Repeat,
} from '@/schemas/today'

/** The repeat choices the pop-up offers. */
const REPEAT_CHOICES: { value: Repeat; label: string }[] = [
  { value: 'just_today', label: 'Doesn’t repeat' },
  { value: 'every_day', label: 'Every day' },
  { value: 'every_week', label: 'Every week' },
]

const DAY_LABELS: Record<QuickAddDay, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  date: 'Pick a date…',
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

const selectClass =
  'h-10 w-full appearance-none rounded-lg border border-input bg-card pr-9 pl-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60'

type AddTaskDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Gets a one-off task (with its day) or a repeating item. Throw an Error to show its message. */
  onSubmit: (result: QuickAddResult) => void | Promise<void>
  /** The user's today. Defaults to Sarajevo today. */
  today?: DateKey
  /** The day on screen: Day starts on it. Defaults to today. */
  viewedDay?: DateKey
}

/** "Add task" pop-up: 1. task name, 2. day and time (optional), 3. repeat (no / every day / every week). */
export function AddTaskDialog({ open, onOpenChange, onSubmit, today, viewedDay }: AddTaskDialogProps) {
  // There's no built-in trigger, so remember what had focus (e.g. the Add task button) and go back to it on close.
  const returnFocus = useRef<HTMLElement | null>(null)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <DialogTitle className="text-lg font-semibold">Add task</DialogTitle>
          <DialogDescription>Only the name is needed. Day, time and repeat are up to you.</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so it starts fresh every time. */}
        {open && (
          <AddTaskForm
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            today={today ?? getToday()}
            viewedDay={viewedDay ?? today ?? getToday()}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Step({ number, children }: { number: number; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-brand-tint text-[11px] font-bold text-brand">
        {number}
      </span>
      {children}
    </span>
  )
}

function Chevron() {
  return (
    <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-2" aria-hidden="true" />
  )
}

function AddTaskForm({
  onSubmit,
  onCancel,
  today,
  viewedDay,
}: Pick<AddTaskDialogProps, 'onSubmit'> & { onCancel: () => void; today: DateKey; viewedDay: DateKey }) {
  const id = useId()
  const defaults = useMemo<QuickAddFormInput>(
    () => ({ text: '', time: '', repeat: 'just_today', ...defaultQuickAddDay(viewedDay, today) }),
    [viewedDay, today],
  )
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<QuickAddFormInput, unknown, QuickAddFormValues>({
    resolver: zodResolver(quickAddFormSchema),
    defaultValues: defaults,
  })
  const repeat = useWatch({ control, name: 'repeat' }) ?? 'just_today'
  const day = useWatch({ control, name: 'day' }) ?? 'today'
  const date = useWatch({ control, name: 'date' }) ?? ''
  const everyDay = repeat === 'every_day'
  const weekday = WEEKDAYS[dayIndex(quickAddDueDate(day, date || undefined, today))]

  const save = handleSubmit(async (values) => {
    const outcome = buildQuickAdd(values, today)
    if (!outcome.ok) {
      setError('text', { message: outcome.message }, { shouldFocus: true })
      return
    }
    try {
      await onSubmit(outcome.value)
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : "Couldn't add the task. Try again." })
    }
  })

  const textError = errors.text?.message
  const whenError = errors.date?.message ?? errors.time?.message

  return (
    <form noValidate onSubmit={save} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor={`${id}-text`}>
          <Step number={1}>Task name</Step>
        </Label>
        <Input
          id={`${id}-text`}
          autoComplete="off"
          placeholder="e.g. Call Amir about the website"
          aria-invalid={textError ? true : undefined}
          aria-describedby={textError ? `${id}-text-error ${id}-text-hint` : `${id}-text-hint`}
          {...register('text')}
        />
        {textError && (
          <p id={`${id}-text-error`} className="text-xs text-bad">
            {textError}
          </p>
        )}
        <p id={`${id}-text-hint`} className="text-xs text-ink-2">
          Tip: #tag and !high work in the name.
        </p>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2">
          <Step number={2}>Day and time (optional)</Step>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-day`} className="text-[13px] font-normal text-ink-2">
              Day
            </Label>
            <div className="relative">
              <select
                id={`${id}-day`}
                className={selectClass}
                disabled={everyDay}
                aria-describedby={everyDay ? `${id}-day-hint` : undefined}
                {...register('day')}
              >
                {Object.entries(DAY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-time`} className="text-[13px] font-normal text-ink-2">
              Time
            </Label>
            <Input id={`${id}-time`} type="time" aria-invalid={errors.time ? true : undefined} {...register('time')} />
          </div>
        </div>
        {day === 'date' && !everyDay && (
          <Input
            type="date"
            aria-label="Task date"
            min={today}
            aria-invalid={errors.date ? true : undefined}
            {...register('date')}
          />
        )}
        {everyDay && (
          <p id={`${id}-day-hint`} className="text-xs text-ink-2">
            Every day starts today.
          </p>
        )}
        {whenError && <p className="text-xs text-bad">{whenError}</p>}
      </fieldset>

      <fieldset>
        <legend className="mb-2">
          <Step number={3}>Repeat</Step>
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {REPEAT_CHOICES.map((choice) => (
            <label
              key={choice.value}
              className={cn(
                'flex cursor-pointer items-center justify-center rounded-lg border border-border bg-card px-2 py-2 text-center text-sm font-medium text-foreground',
                'has-checked:border-brand has-checked:bg-brand-tint has-checked:text-brand has-focus-visible:ring-2 has-focus-visible:ring-brand',
              )}
            >
              <input type="radio" value={choice.value} className="sr-only" {...register('repeat')} />
              {choice.label}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-2">
          {repeat === 'every_week'
            ? `Shows on Today every ${weekday}.`
            : everyDay
              ? 'Shows on Today every day.'
              : 'A one-off task for that day.'}
        </p>
      </fieldset>

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
          Add task
        </Button>
      </div>
    </form>
  )
}
