import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useId } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { cn } from 'cn'
import { GoalField } from '@/components/goals/GoalField'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import type { FinanceKind } from '@/lib/finance'
import {
  DEFAULT_CATEGORY,
  financeEntryFormSchema,
  type FinanceEntryFormInput,
  type FinanceEntryFormValues,
} from '@/schemas/finance'
import { CurrencySelect } from './CurrencySelect'

type FinanceEntryFormProps = {
  /** Throw an Error to show its message under the form. */
  onSubmit: (values: FinanceEntryFormValues) => void | Promise<void>
  /** Category suggestions for each kind (you can still type a new one). */
  categories: Record<FinanceKind, readonly string[]>
  /** The Day field starts here (the user's today). */
  today: string
  /** Editing a log: its values. */
  defaultValues?: FinanceEntryFormInput
  /** "Add" (default) or "Save". */
  submitLabel?: string
  /** Shows a Cancel button. */
  onCancel?: () => void
}

const KINDS: { value: FinanceKind; label: string }[] = [
  { value: 'expense', label: 'Spent' },
  { value: 'income', label: 'Earned' },
]

/**
 * One money log: Spent / Earned, name, amount in € or KM, day, optional description and category. Enter adds it.
 * Glass fields with the label inside (like the goal forms); put it in a .glass-form dialog.
 */
export function FinanceEntryForm({
  onSubmit,
  categories,
  today,
  defaultValues,
  submitLabel = 'Add',
  onCancel,
}: FinanceEntryFormProps) {
  const id = useId()
  const errorId = `${id}-error`
  const blank: FinanceEntryFormInput = { kind: 'expense', name: '', amount: '', currency: 'eur', category: '', date: today, note: '' }
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    setFocus,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FinanceEntryFormInput, unknown, FinanceEntryFormValues>({
    resolver: zodResolver(financeEntryFormSchema),
    defaultValues: defaultValues ?? blank,
  })
  const kind = useWatch({ control, name: 'kind' }) ?? 'expense'

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
      if (!defaultValues) {
        // Keep Spent/Earned, the currency and the day for the next one.
        reset({ ...blank, kind: values.kind, currency: values.currency, date: values.date })
        // After the reset has re-rendered the fields.
        setTimeout(() => setFocus('name'))
      }
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : "Couldn't save it. Try again." })
    }
  })

  const message =
    errors.name?.message ??
    errors.amount?.message ??
    errors.date?.message ??
    errors.note?.message ??
    errors.category?.message ??
    errors.root?.message
  const describedBy = message ? errorId : undefined

  return (
    <form onSubmit={submit} noValidate aria-label={defaultValues ? 'Edit log' : 'Add log'} className="flex flex-col gap-3">
      <div role="group" aria-label="Type" className="glass-input flex h-11 border p-1 sm:w-[240px]">
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            aria-pressed={kind === k.value}
            onClick={() => setValue('kind', k.value)}
            className={cn(
              'flex-1 rounded-lg px-3 text-[13px] font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              kind === k.value ? 'bg-card text-foreground shadow-none ring-1 ring-border' : 'text-ink-2 hover:text-foreground',
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      <GoalField floating id={`${id}-name`} label="Name">
        {() => (
          <Input
            id={`${id}-name`}
            autoComplete="off"
            placeholder=" "
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy}
            {...register('name')}
          />
        )}
      </GoalField>

      <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
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
      </div>

      <GoalField floating id={`${id}-date`} label="Day">
        {() => (
          <Controller
            control={control}
            name="date"
            render={({ field: { value, onChange, onBlur } }) => (
              <DatePicker
                id={`${id}-date`}
                placeholder=""
                today={today}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                aria-invalid={errors.date ? true : undefined}
                aria-describedby={describedBy}
              />
            )}
          />
        )}
      </GoalField>

      <GoalField floating id={`${id}-note`} label="Description (optional)">
        {() => (
          <Input
            id={`${id}-note`}
            autoComplete="off"
            placeholder=" "
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={describedBy}
            {...register('note')}
          />
        )}
      </GoalField>

      <GoalField floating id={`${id}-category`} label="Category (optional)" hint={`Left empty, it goes under ${DEFAULT_CATEGORY}.`}>
        {(hintId) => (
          <Input
            id={`${id}-category`}
            list={`${id}-categories`}
            autoComplete="off"
            placeholder=" "
            aria-invalid={errors.category ? true : undefined}
            aria-describedby={[hintId, describedBy].filter(Boolean).join(' ') || undefined}
            {...register('category')}
          />
        )}
      </GoalField>
      <datalist id={`${id}-categories`}>
        {categories[kind].map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </datalist>

      {message && (
        <p id={errorId} role="alert" className="text-[13px] text-bad">
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="glass-button glass-button-primary" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" className="glass-button" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
