import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useId } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MonthKey } from '@/lib/metrics'
import { logValueFormSchema, type LogValueFormInput, type LogValueFormValues, type Unit } from '@/schemas/stats'
import { monthName, valueLabel } from './format'

type LogValueFormProps = {
  unit: Unit
  /** Months to choose from, newest first, e.g. this year up to now. */
  months: readonly MonthKey[]
  defaultMonth: MonthKey
  /** Values already logged, so picking a month shows what's there and saving replaces it. */
  existing?: Readonly<Record<MonthKey, { value: number; note: string | null }>>
  /** Throw an Error to show its message. */
  onSubmit: (values: LogValueFormValues) => Promise<void> | void
}

const selectClass =
  'h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

/** "Log a value": month, the total for that month, optional note. */
export function LogValueForm({ unit, months, defaultMonth, existing = {}, onSubmit }: LogValueFormProps) {
  const id = useId()
  const fill = (month: MonthKey) => ({
    month,
    value: existing[month] ? String(existing[month].value) : '',
    note: existing[month]?.note ?? '',
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LogValueFormInput, unknown, LogValueFormValues>({
    resolver: zodResolver(logValueFormSchema),
    defaultValues: fill(defaultMonth),
  })
  const month = useWatch({ control, name: 'month' })
  const replacing = Boolean(month && existing[month])

  const save = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Couldn’t save. Try again.' })
    }
  })

  const valueError = errors.value?.message
  const noteError = errors.note?.message

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <h2 id={`${id}-title`} className="mb-3 text-base font-semibold text-foreground">
        Log a value
      </h2>
      <form noValidate onSubmit={save} className="flex flex-col gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-month`}>Month</Label>
          <select
            id={`${id}-month`}
            className={selectClass}
            {...register('month', { onChange: (e: { target: { value: string } }) => reset(fill(e.target.value)) })}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {monthName(m, months.some((other) => other.slice(0, 4) !== m.slice(0, 4)))}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-value`}>{valueLabel(unit)}</Label>
          <Input
            id={`${id}-value`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            aria-invalid={valueError ? true : undefined}
            aria-describedby={valueError ? `${id}-value-error` : undefined}
            {...register('value')}
          />
          {valueError && (
            <p id={`${id}-value-error`} className="text-xs text-bad">
              {valueError}
            </p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-note`}>Note (optional)</Label>
          <Input
            id={`${id}-note`}
            placeholder="e.g. 2 new clients"
            autoComplete="off"
            aria-invalid={noteError ? true : undefined}
            aria-describedby={noteError ? `${id}-note-error` : undefined}
            {...register('note')}
          />
          {noteError && (
            <p id={`${id}-note-error`} className="text-xs text-bad">
              {noteError}
            </p>
          )}
        </div>

        {errors.root?.message && (
          <p role="alert" className="rounded-lg bg-bad-tint p-3 text-[13px] text-bad">
            {errors.root.message}
          </p>
        )}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
          {replacing ? 'Update entry' : 'Save entry'}
        </Button>
        <p className="text-xs text-ink-2">
          {replacing
            ? `${monthName(month)} already has a value; saving replaces it.`
            : 'Pick a month and type the total for that month.'}
        </p>
      </form>
    </section>
  )
}
