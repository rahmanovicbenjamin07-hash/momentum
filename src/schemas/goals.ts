import { z } from 'zod'
import { getToday, type DateKey } from '@/lib/dates'
import { dateKeySchema } from './today'

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

/** Postgres timestamptz, e.g. "2026-10-28T19:19:45.123456+00:00". */
const timestampSchema = z.iso.datetime({ offset: true })

export const GOAL_LIMITS = {
  title: 80,
  shortLabel: 24,
  note: 200,
  /** Largest target or value (fits € amounts, hours, days…). */
  target: 100_000_000,
} as const

const tooLong = (max: number) => `Keep it under ${max} characters`

/** Treats "", whitespace, null and NaN (empty number input) as "not filled in". */
const blankToUndefined = (value: unknown) =>
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (typeof value === 'number' && Number.isNaN(value))
    ? undefined
    : value

/** "10 000", "10,000" and "10000.50" → 10000 / 10000.5 (spaces and thousands commas removed). */
const looseNumber = (value: unknown) => {
  const blank = blankToUndefined(value)
  if (typeof blank !== 'string') return blank
  const cleaned = blank.replace(/\s/g, '')
  // "1,5" (decimal comma) → 1.5; "10,000" (thousands) → 10000.
  const normalised = /^\d+,\d{1,2}$/.test(cleaned) ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '')
  return normalised
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** total = add up to a number (e.g. €18,000 this year); level = reach a level (e.g. €3,000 in one month). */
export const GOAL_TYPES = ['total', 'level'] as const
export const goalTypeSchema = z.enum(GOAL_TYPES)
export type GoalType = z.infer<typeof goalTypeSchema>

/** What the goal is measured on: one of My metrics, a routine item, or numbers you enter yourself. */
export const SOURCE_KINDS = ['metric', 'routine', 'manual'] as const
export const sourceKindSchema = z.enum(SOURCE_KINDS)
export type SourceKind = z.infer<typeof sourceKindSchema>

/** Units a goal can use: the metric units plus Bosnian marks (KM). */
export const GOAL_UNITS = ['eur', 'bam', 'count', 'hours', 'km', 'days'] as const
export const goalUnitSchema = z.enum(GOAL_UNITS)
export type GoalUnit = z.infer<typeof goalUnitSchema>
export const GOAL_UNIT_LABELS: Record<GoalUnit, string> = {
  eur: 'Euro (€)',
  bam: 'Bosnian mark (KM)',
  count: 'Number',
  hours: 'Hours',
  km: 'Kilometres',
  days: 'Days',
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

const titleSchema = z
  .string()
  .trim()
  .min(1, 'Name the goal')
  .max(GOAL_LIMITS.title, tooLong(GOAL_LIMITS.title))
const shortLabelSchema = z
  .string()
  .trim()
  .min(1, 'Add a short label')
  .max(GOAL_LIMITS.shortLabel, tooLong(GOAL_LIMITS.shortLabel))
const noteSchema = z.string().trim().max(GOAL_LIMITS.note, tooLong(GOAL_LIMITS.note))

export const goalSchema = z
  .object({
    id: z.uuid(),
    user_id: z.uuid(),
    title: titleSchema,
    short_label: shortLabelSchema,
    type: goalTypeSchema,
    source_kind: sourceKindSchema,
    /** metrics.id or routine_items.id; null for manual goals. */
    source_id: z.uuid().nullable(),
    /** Manual goals only (linked goals use their metric's unit). Older backups lack it. */
    unit: goalUnitSchema.nullable().default(null),
    target: z.number().positive().max(GOAL_LIMITS.target),
    /** Value at start_date, e.g. money already saved. Older backups lack it. */
    start_value: z.number().min(0).max(GOAL_LIMITS.target).default(0),
    start_date: dateKeySchema,
    deadline: dateKeySchema,
    /** Total goals on money: count open deals (weighted by stage) towards the goal. */
    include_pipeline: z.boolean(),
    created_at: timestampSchema,
  })
  .refine((goal) => goal.deadline > goal.start_date, {
    message: 'The deadline must be after the start date',
    path: ['deadline'],
  })
  .refine((goal) => (goal.source_kind === 'manual') === (goal.source_id === null), {
    message: 'Only manual goals have no source',
    path: ['source_id'],
  })
export type Goal = z.output<typeof goalSchema>

/** One value typed in for a manual goal: "on 12 Oct 2026 I had €4,200". */
export const goalUpdateSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  goal_id: z.uuid(),
  date: dateKeySchema,
  value: z.number().min(0).max(GOAL_LIMITS.target),
  note: noteSchema.nullable(),
  created_at: timestampSchema,
})
export type GoalUpdate = z.infer<typeof goalUpdateSchema>

// ---------------------------------------------------------------------------
// Forms
// With React Hook Form: useForm<…FormInput, unknown, …FormValues>.
// ---------------------------------------------------------------------------

const amount = (required: string) =>
  z.preprocess(
    looseNumber,
    z.coerce
      .number({ error: required })
      .min(0, 'Use 0 or more')
      .max(GOAL_LIMITS.target, 'That number is too large'),
  )

/**
 * "New goal": any number you want to reach by a date, updated by hand.
 * Start date can be in the past; the deadline must be after `today` and after the start.
 */
export function newGoalFormSchema(today: DateKey = getToday()) {
  return z
    .object({
      title: titleSchema,
      /** Optional: the first 24 characters of the name when left empty. */
      short_label: z.string().trim().max(GOAL_LIMITS.shortLabel, tooLong(GOAL_LIMITS.shortLabel)),
      unit: goalUnitSchema.default('eur'),
      start_value: z.preprocess((v) => looseNumber(v) ?? 0, amount('Enter a starting point')),
      target: amount('Enter a target'),
      start_date: dateKeySchema.refine((date) => date <= today, 'The start can’t be in the future'),
      deadline: dateKeySchema.refine((date) => date > today, 'Pick a date after today'),
    })
    .refine((v) => v.target > v.start_value, {
      message: 'The target must be more than the starting point',
      path: ['target'],
    })
    .transform((v) => ({ ...v, short_label: v.short_label || v.title.slice(0, GOAL_LIMITS.shortLabel).trim() }))
}
export type NewGoalFormInput = z.input<ReturnType<typeof newGoalFormSchema>>
export type NewGoalFormValues = z.output<ReturnType<typeof newGoalFormSchema>>

/** "Update goal": where the goal stands on a day (not before its start, not after today). */
export function goalUpdateFormSchema(startDate: DateKey, today: DateKey = getToday()) {
  return z.object({
    value: amount('Enter the current number'),
    date: dateKeySchema
      .refine((date) => date <= today, 'Pick today or an earlier day')
      .refine((date) => date >= startDate, 'Pick a day on or after the goal’s start'),
    note: noteSchema.optional().transform((note) => note || null),
  })
}
export type GoalUpdateFormInput = z.input<ReturnType<typeof goalUpdateFormSchema>>
export type GoalUpdateFormValues = z.output<ReturnType<typeof goalUpdateFormSchema>>
