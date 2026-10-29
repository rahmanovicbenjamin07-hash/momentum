import { useId, useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Loader2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getToday, type DateKey } from '@/lib/dates'
import { buildQuickAdd, defaultQuickAddDay, type QuickAddResult } from '@/lib/quickAddSubmit'
import {
  quickAddFormSchema,
  type QuickAddDay,
  type QuickAddFormInput,
  type QuickAddFormValues,
  type Repeat,
} from '@/schemas/today'

const REPEAT_LABELS: Record<Repeat, string> = {
  just_today: 'Doesn’t repeat',
  weekdays: 'Weekdays',
  every_day: 'Every day',
  weekends: 'Weekends',
}

const DAY_LABELS: Record<QuickAddDay, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  date: 'Pick a date…',
}

const selectClass =
  'h-10 w-full appearance-none rounded-lg border border-input bg-card pr-9 pl-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60'

type QuickAddBarProps = {
  /** Gets a one-off task (with its day) or a repeating item. Throw an Error to show its message under the field. */
  onSubmit: (result: QuickAddResult) => void | Promise<void>
  /** The user's today. Defaults to Sarajevo today. */
  today?: DateKey
  /** The day on screen: the Day field starts on it. Defaults to today. */
  viewedDay?: DateKey
}

function Chevron() {
  return (
    <ChevronDown
      className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-2"
      aria-hidden="true"
    />
  )
}

/** "Task / Day / Time (optional) / Repeat / Add task". Enter submits; the text clears and stays focused for the next one. */
export function QuickAddBar({ onSubmit, today: todayProp, viewedDay }: QuickAddBarProps) {
  const id = useId()
  const textId = `${id}-text`
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const today = todayProp ?? getToday()
  const defaults = useMemo<QuickAddFormInput>(
    () => ({ text: '', time: '', repeat: 'just_today', ...defaultQuickAddDay(viewedDay ?? today, today) }),
    [viewedDay, today],
  )

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<QuickAddFormInput, unknown, QuickAddFormValues>({
    resolver: zodResolver(quickAddFormSchema),
    defaultValues: defaults,
  })
  const repeat = useWatch({ control, name: 'repeat' }) ?? 'just_today'
  const day = useWatch({ control, name: 'day' }) ?? 'today'
  const repeating = repeat !== 'just_today'

  const submit = handleSubmit(async (values) => {
    const outcome = buildQuickAdd(values, today)
    if (!outcome.ok) {
      setError('text', { message: outcome.message }, { shouldFocus: true })
      return
    }
    try {
      await onSubmit(outcome.value)
      // Keep the chosen day, so several tasks can be planned for it in a row.
      reset({ ...defaults, day: values.day, date: values.date ?? '' })
      setFocus('text')
    } catch (error) {
      setError('text', { message: error instanceof Error ? error.message : "Couldn't add the task. Try again." })
    }
  })

  const textError = errors.text?.message ?? errors.time?.message ?? errors.date?.message

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label="Add a task"
      className="rounded-xl border border-border bg-card px-4 pt-3 pb-3"
    >
      <div className="grid items-start gap-3 sm:grid-cols-[auto_auto_auto_1fr] lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
        <div className="grid gap-1.5 sm:col-span-4 lg:col-span-1">
          <Label htmlFor={textId} className="text-[13px] font-normal text-ink-2">
            Task
          </Label>
          <Input
            id={textId}
            autoComplete="off"
            placeholder="e.g. Call Amir about the website #outreach !high"
            aria-invalid={textError ? true : undefined}
            aria-describedby={textError ? `${errorId} ${hintId}` : hintId}
            {...register('text')}
          />
          {textError && (
            <p id={errorId} role="alert" className="text-[13px] text-bad">
              {textError}
            </p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-day`} className="text-[13px] font-normal text-ink-2">
            Day
          </Label>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-[150px]">
              <select
                id={`${id}-day`}
                className={selectClass}
                disabled={repeating}
                title={repeating ? 'Repeating tasks show on their repeat days' : undefined}
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
            {day === 'date' && !repeating && (
              <Input
                type="date"
                aria-label="Task date"
                className="w-full sm:w-[160px]"
                aria-invalid={errors.date ? true : undefined}
                {...register('date')}
              />
            )}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-time`} className="text-[13px] font-normal text-ink-2">
            Time (optional)
          </Label>
          <Input
            id={`${id}-time`}
            type="time"
            className="w-full sm:w-[132px]"
            aria-invalid={errors.time ? true : undefined}
            {...register('time')}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-repeat`} className="text-[13px] font-normal text-ink-2">
            Repeat
          </Label>
          <div className="relative">
            <select id={`${id}-repeat`} className={`${selectClass} sm:w-[160px]`} {...register('repeat')}>
              {Object.entries(REPEAT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Chevron />
          </div>
        </div>
        {/* Top margin = label height + gap, so the button lines up with the inputs. */}
        <Button type="submit" disabled={isSubmitting} className="w-full sm:mt-[19px] sm:w-auto sm:justify-self-start">
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          Add task
        </Button>
      </div>
      <p id={hintId} className="mt-2 text-xs text-ink-2">
        Plan ahead with Day · Time is optional · #tag and !high work in the task text
      </p>
    </form>
  )
}
