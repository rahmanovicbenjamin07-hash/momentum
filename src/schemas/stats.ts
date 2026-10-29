import { z } from 'zod'
import { monthSchema } from './outreach'
import { dateKeySchema } from './today'

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

/** Postgres timestamptz, e.g. "2026-10-28T19:19:45.123456+00:00". */
const timestampSchema = z.iso.datetime({ offset: true })

/** Every table has these (see CLAUDE.md → Security). */
const rowBase = {
  id: z.uuid(),
  user_id: z.uuid(),
  created_at: timestampSchema,
}

export const STATS_LIMITS = {
  metricName: 80,
  entryNote: 500,
  /** Largest value or goal (fits € amounts, hours, km…). */
  value: 100_000_000,
} as const

const tooLong = (max: number) => `Keep it under ${max} characters`

/** Treats "", whitespace, null and NaN (empty number input) as "not filled in". */
const blankToUndefined = (value: unknown) =>
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (typeof value === 'number' && Number.isNaN(value))
    ? undefined
    : value

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const UNITS = ['eur', 'count', 'hours', 'km', 'days'] as const
export const unitSchema = z.enum(UNITS)
export type Unit = z.infer<typeof unitSchema>
export const UNIT_LABELS: Record<Unit, string> = {
  eur: 'Euro (€)',
  count: 'Count',
  hours: 'Hours',
  km: 'Kilometres',
  days: 'Days',
}

export const LOG_EVERY = ['daily', 'weekly', 'monthly'] as const
export const logEverySchema = z.enum(LOG_EVERY)
export type LogEvery = z.infer<typeof logEverySchema>
export const LOG_EVERY_LABELS: Record<LogEvery, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

const valueSchema = z.number().min(0).max(STATS_LIMITS.value)

export const metricSchema = z.object({
  ...rowBase,
  name: z.string().trim().min(1).max(STATS_LIMITS.metricName),
  unit: unitSchema,
  log_every: logEverySchema,
  /** null = no yearly goal. */
  yearly_goal: z.number().positive().max(STATS_LIMITS.value).nullable(),
})
export type Metric = z.infer<typeof metricSchema>

export const metricEntrySchema = z.object({
  ...rowBase,
  metric_id: z.uuid(),
  /** Monthly metrics use the 1st of the month, e.g. "2026-10-01". */
  entry_date: dateKeySchema,
  value: valueSchema,
  note: z.string().max(STATS_LIMITS.entryNote).nullable(),
  /** Set when the entry came from a won deal (Outreach). */
  contact_id: z.uuid().nullable(),
})
export type MetricEntry = z.infer<typeof metricEntrySchema>

// ---------------------------------------------------------------------------
// Forms
// With React Hook Form: useForm<XFormInput, unknown, XFormValues>.
// ---------------------------------------------------------------------------

/** "New metric": name, unit, how often, optional yearly goal. */
export const newMetricFormSchema = z.object({
  name: z.string().trim().min(1, 'Name the metric').max(STATS_LIMITS.metricName, tooLong(STATS_LIMITS.metricName)),
  unit: unitSchema.default('count'),
  log_every: logEverySchema.default('monthly'),
  yearly_goal: z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ error: 'Enter a number' })
      .positive('The goal must be more than 0')
      .max(STATS_LIMITS.value, 'That goal is too large')
      .optional(),
  ),
})
export type NewMetricFormInput = z.input<typeof newMetricFormSchema>
export type NewMetricFormValues = z.output<typeof newMetricFormSchema>

/** "Log a value": month ("yyyy-MM"), the value for it, optional note. Store with `entryDateForMonth`. */
export const logValueFormSchema = z.object({
  month: monthSchema,
  value: z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ error: 'Enter a value' })
      .min(0, 'Can’t be negative')
      .max(STATS_LIMITS.value, 'That value is too large'),
  ),
  note: z
    .string()
    .trim()
    .max(STATS_LIMITS.entryNote, tooLong(STATS_LIMITS.entryNote))
    .optional()
    .transform((value) => value || undefined),
})
export type LogValueFormInput = z.input<typeof logValueFormSchema>
export type LogValueFormValues = z.output<typeof logValueFormSchema>

/** "2026-10" → "2026-10-01" (the entry_date a monthly value is stored under). */
export function entryDateForMonth(month: string): string {
  return `${month}-01`
}
