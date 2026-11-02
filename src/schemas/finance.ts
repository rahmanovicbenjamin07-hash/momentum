import { z } from 'zod'
import { parseAmount } from '@/lib/finance'
import { dateKeySchema } from './today'

export const FINANCE_KINDS = ['income', 'expense'] as const
export const FINANCE_CURRENCIES = ['eur', 'bam'] as const

export const financeKindSchema = z.enum(FINANCE_KINDS)
export const financeCurrencySchema = z.enum(FINANCE_CURRENCIES)

/** Same limits as the database checks. */
export const FINANCE_LIMITS = {
  amountMax: 100_000_000,
  name: 60,
  category: 40,
  note: 200,
} as const

const rowBase = {
  id: z.uuid(),
  user_id: z.uuid(),
  created_at: z.string(),
}

/** numeric columns arrive as numbers or strings depending on the client. */
const money = z.coerce.number()

export const financeEntrySchema = z.object({
  ...rowBase,
  date: dateKeySchema,
  kind: financeKindSchema,
  name: z.string().trim().min(1).max(FINANCE_LIMITS.name),
  amount: money,
  currency: financeCurrencySchema,
  amount_eur: money,
  category: z.string().trim().min(1).max(FINANCE_LIMITS.category),
  note: z.string().max(FINANCE_LIMITS.note).nullable(),
})
export type FinanceEntry = z.infer<typeof financeEntrySchema>

export const financeSettingsSchema = z.object({
  ...rowBase,
  starting_savings: money,
  starting_currency: financeCurrencySchema,
  starting_date: dateKeySchema,
})
export type FinanceSettings = z.infer<typeof financeSettingsSchema>

/** Amount text → number in € or KM. `allowZero` / `allowNegative` for the starting savings. */
function amountField({ allowZero = false, allowNegative = false } = {}) {
  return z
    .string()
    .trim()
    .min(1, 'Enter an amount')
    .transform((text, ctx) => {
      const value = parseAmount(text)
      if (value === null) {
        ctx.addIssue({ code: 'custom', message: 'Enter a number, e.g. 1250 or 12.50' })
        return z.NEVER
      }
      if (value < 0 && !allowNegative) {
        ctx.addIssue({ code: 'custom', message: 'Enter an amount above 0' })
        return z.NEVER
      }
      if (value === 0 && !allowZero) {
        ctx.addIssue({ code: 'custom', message: 'Enter an amount above 0' })
        return z.NEVER
      }
      if (Math.abs(value) >= FINANCE_LIMITS.amountMax) {
        ctx.addIssue({ code: 'custom', message: 'That amount is too big' })
        return z.NEVER
      }
      return Math.round(value * 100) / 100
    })
}

/** A log left without a category goes here. */
export const DEFAULT_CATEGORY = 'Other'

/** The "add log" form: Earned/Spent, name, amount, € or KM, day, optional description (note) and category. */
export const financeEntryFormSchema = z.object({
  kind: financeKindSchema,
  name: z
    .string()
    .trim()
    .min(1, 'Give it a name, e.g. Groceries')
    .max(FINANCE_LIMITS.name, `Keep the name under ${FINANCE_LIMITS.name} characters`),
  amount: amountField(),
  currency: financeCurrencySchema,
  category: z
    .string()
    .trim()
    .max(FINANCE_LIMITS.category, `Keep the category under ${FINANCE_LIMITS.category} characters`)
    .transform((category) => (category === '' ? DEFAULT_CATEGORY : category)),
  date: dateKeySchema,
  note: z
    .string()
    .trim()
    .max(FINANCE_LIMITS.note, `Keep it under ${FINANCE_LIMITS.note} characters`)
    .transform((note) => (note === '' ? null : note)),
})
export type FinanceEntryFormInput = z.input<typeof financeEntryFormSchema>
export type FinanceEntryFormValues = z.output<typeof financeEntryFormSchema>

/** "I had €X saved on <date>". */
export const startingSavingsFormSchema = z.object({
  amount: amountField({ allowZero: true, allowNegative: true }),
  currency: financeCurrencySchema,
  date: dateKeySchema,
})
export type StartingSavingsFormInput = z.input<typeof startingSavingsFormSchema>
export type StartingSavingsFormValues = z.output<typeof startingSavingsFormSchema>
