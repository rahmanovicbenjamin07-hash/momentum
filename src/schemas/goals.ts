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
  /** Largest target (fits € amounts, hours, days…). */
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

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** total = add up to a number (e.g. €18,000 this year); level = reach a level (e.g. €3,000 in one month). */
export const GOAL_TYPES = ['total', 'level'] as const
export const goalTypeSchema = z.enum(GOAL_TYPES)
export type GoalType = z.infer<typeof goalTypeSchema>
export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  total: 'Reach a total',
  level: 'Reach a level',
}

/** What the goal is measured on: one of My metrics, or a routine item. */
export const SOURCE_KINDS = ['metric', 'routine'] as const
export const sourceKindSchema = z.enum(SOURCE_KINDS)
export type SourceKind = z.infer<typeof sourceKindSchema>
export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  metric: 'A metric',
  routine: 'A routine item',
}

// ---------------------------------------------------------------------------
// Row
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

export const goalSchema = z
  .object({
    id: z.uuid(),
    user_id: z.uuid(),
    title: titleSchema,
    short_label: shortLabelSchema,
    type: goalTypeSchema,
    source_kind: sourceKindSchema,
    source_id: z.uuid(),
    target: z.number().positive().max(GOAL_LIMITS.target),
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
export type Goal = z.infer<typeof goalSchema>

// ---------------------------------------------------------------------------
// Forms
// With React Hook Form: useForm<NewGoalFormInput, unknown, NewGoalFormValues>.
// ---------------------------------------------------------------------------

/** "New goal". The deadline must be after `today` (the user's today; defaults to Sarajevo time now). */
export function newGoalFormSchema(today: DateKey = getToday()) {
  return z.object({
    title: titleSchema,
    short_label: shortLabelSchema,
    type: goalTypeSchema.default('total'),
    source_kind: sourceKindSchema.default('metric'),
    source_id: z.uuid('Pick what the goal is measured on'),
    target: z.preprocess(
      blankToUndefined,
      z.coerce
        .number({ error: 'Enter a target' })
        .positive('The target must be more than 0')
        .max(GOAL_LIMITS.target, 'That target is too large'),
    ),
    deadline: dateKeySchema.refine((date) => date > today, 'Pick a date after today'),
  })
}
export type NewGoalFormInput = z.input<ReturnType<typeof newGoalFormSchema>>
export type NewGoalFormValues = z.output<ReturnType<typeof newGoalFormSchema>>
