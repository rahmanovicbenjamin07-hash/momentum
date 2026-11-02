import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useId, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { GoalField } from '@/components/goals/GoalField'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/dates'
import { formatAmount, type FinanceCurrency } from '@/lib/finance'
import {
  startingSavingsFormSchema,
  type StartingSavingsFormInput,
  type StartingSavingsFormValues,
} from '@/schemas/finance'
import { CurrencySelect } from './CurrencySelect'

type StartingSavingsCardProps = {
  /** null = not set yet. */
  current: { amount: number; currency: FinanceCurrency; date: string } | null
  today: string
  /** Throw an Error to show its message. */
  onSave: (values: StartingSavingsFormValues) => void | Promise<void>
}

/** Same height as the floating-label fields next to them. */
const fieldHeightButton = 'h-[3.25rem] px-5'

/** "I had €X saved on <date>": where Saved starts counting from. Glass fields with the label inside, like the goal forms. */
export function StartingSavingsCard({ current, today, onSave }: StartingSavingsCardProps) {
  const id = useId()
  const errorId = `${id}-error`
  const [editing, setEditing] = useState(current === null)
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<StartingSavingsFormInput, unknown, StartingSavingsFormValues>({
    resolver: zodResolver(startingSavingsFormSchema),
    defaultValues: current
      ? { amount: String(current.amount), currency: current.currency, date: current.date }
      : { amount: '', currency: 'eur', date: today },
  })

  const submit = handleSubmit(async (values) => {
    try {
      await onSave(values)
      setEditing(false)
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : "Couldn't save it. Try again." })
    }
  })
  const message = errors.amount?.message ?? errors.date?.message ?? errors.root?.message
  const describedBy = message ? errorId : undefined

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
        Starting savings
      </h2>
      {!editing && current ? (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-2">
            You had <span className="font-semibold text-foreground tabular-nums">{formatAmount(current.amount, current.currency)}</span>{' '}
            saved on {formatDate(current.date)}. Saved adds everything you earn and takes off what you spend since then.
          </p>
          <Button variant="outline" size="sm" className="glass-button" onClick={() => setEditing(true)}>
            Change
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate aria-label="Starting savings" className="glass-form glass-form-plain mt-1 flex flex-col gap-3">
          <p className="text-sm text-ink-2">How much did you already have saved before you started logging here?</p>
          <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_110px_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_110px_minmax(0,1fr)_auto]">
            <GoalField floating id={`${id}-amount`} label="Amount">
              {() => (
                <Input
                  id={`${id}-amount`}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder=" "
                  className="tabular-nums"
                  aria-invalid={errors.amount ? true : undefined}
                  aria-describedby={describedBy}
                  {...register('amount')}
                />
              )}
            </GoalField>
            <GoalField floating id={`${id}-currency`} label="Currency">
              {() => (
                <Controller
                  control={control}
                  name="currency"
                  render={({ field: { value, onChange, onBlur, ref } }) => (
                    <CurrencySelect id={`${id}-currency`} value={value} onChange={onChange} onBlur={onBlur} ref={ref} />
                  )}
                />
              )}
            </GoalField>
            {/* No visible label: the calendar icon and the date say enough. Screen readers hear "Saved on". The wrap adds the corner shine. */}
            <div className="glass-input-wrap">
              <Controller
                control={control}
                name="date"
                render={({ field: { value, onChange, onBlur } }) => (
                  <DatePicker
                    id={`${id}-date`}
                    aria-label="Saved on"
                    className="h-[3.25rem] w-full"
                    today={today}
                    max={today}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    aria-invalid={errors.date ? true : undefined}
                    aria-describedby={describedBy}
                  />
                )}
              />
            </div>
            <div className="flex gap-2 sm:col-span-3 lg:col-span-1">
              <Button type="submit" className={`glass-button glass-button-primary ${fieldHeightButton}`} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
                Save
              </Button>
              {current && (
                <Button type="button" variant="outline" className={`glass-button ${fieldHeightButton}`} onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
          {message && (
            <p id={errorId} role="alert" className="text-[13px] text-bad">
              {message}
            </p>
          )}
        </form>
      )}
    </section>
  )
}
