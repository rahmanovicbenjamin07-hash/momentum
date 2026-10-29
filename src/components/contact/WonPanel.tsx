import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Loader2 } from 'lucide-react'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import type { DateKey } from '@/lib/dates'
import { wonDealFormSchema, type Contact } from '@/schemas/outreach'
import { monthOf, paidMonthOptions } from './format'

const wonPanelSchema = wonDealFormSchema.extend({ add_to_money_earned: z.boolean() })
type WonPanelInput = z.input<typeof wonPanelSchema>
export type WonPanelValues = z.output<typeof wonPanelSchema>

type WonPanelProps = {
  contact: Pick<Contact, 'deal_value' | 'won_amount' | 'won_month'>
  today: DateKey
  /** `month` is "yyyy-MM". Throw an Error to show its message. */
  onSave: (values: WonPanelValues) => Promise<void> | void
}

const inputClass =
  'h-10 rounded-lg border border-good/40 bg-card px-3 text-sm text-foreground tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-bad'

/** Green "Deal won — how much did it bring in?" panel: amount, month paid, add to Money earned. */
export function WonPanel({ contact, today, onSave }: WonPanelProps) {
  const id = useId()
  const [saved, setSaved] = useState(false)
  const months = paidMonthOptions(today)
  const defaultMonth = monthOf(contact.won_month ?? today)
  if (!months.some((m) => m.value === defaultMonth)) months.push({ value: defaultMonth, label: defaultMonth })

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WonPanelInput, unknown, WonPanelValues>({
    resolver: zodResolver(wonPanelSchema),
    defaultValues: {
      amount: contact.won_amount ?? contact.deal_value ?? '',
      month: defaultMonth,
      add_to_money_earned: true,
    },
  })

  const save = handleSubmit(async (values) => {
    setSaved(false)
    try {
      await onSave(values)
      setSaved(true)
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Couldn’t save the deal. Try again.' })
    }
  })

  const amountError = errors.amount?.message
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-good/30 bg-good-tint/60 p-4">
      <h2 id={`${id}-title`} className="mb-2 text-sm font-semibold text-good">
        Deal won — how much did it bring in?
      </h2>
      <form noValidate onSubmit={save} onChange={() => setSaved(false)} className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <label htmlFor={`${id}-amount`} className="text-xs font-medium text-foreground">
            Amount (€)
          </label>
          <input
            id={`${id}-amount`}
            inputMode="decimal"
            autoComplete="off"
            className={`${inputClass} w-36`}
            aria-invalid={amountError ? true : undefined}
            aria-describedby={amountError ? `${id}-amount-error` : undefined}
            {...register('amount')}
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor={`${id}-month`} className="text-xs font-medium text-foreground">
            Paid in
          </label>
          <select id={`${id}-month`} className={`${inputClass} w-36 cursor-pointer`} {...register('month')}>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex h-10 cursor-pointer items-center gap-2 text-sm text-foreground">
          <input type="checkbox" className="size-4 accent-good" {...register('add_to_money_earned')} />
          Add to “Money earned”
        </label>
        <Button type="submit" disabled={isSubmitting} className="bg-good-strong text-white hover:bg-good-strong/90">
          {isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
          Save deal
        </Button>
        <p role="status" className="flex h-10 items-center gap-1 text-sm font-medium text-good empty:hidden">
          {saved && (
            <>
              <Check aria-hidden="true" className="size-4" />
              Saved
            </>
          )}
        </p>
      </form>
      {amountError && (
        <p id={`${id}-amount-error`} className="mt-2 text-xs text-bad">
          {amountError}
        </p>
      )}
      {errors.root?.message && (
        <p role="alert" className="mt-2 rounded-lg bg-bad-tint p-3 text-[13px] text-bad">
          {errors.root.message}
        </p>
      )}
    </section>
  )
}
