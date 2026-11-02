import { z } from 'zod'
import { getToday, isDateKey, type DateKey } from '@/lib/dates'
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
  /** "Why it matters" on an objective. */
  why: 300,
  /** Key results per objective. */
  keyResults: 5,
  milestoneTitle: 120,
  /** Steps per milestones key result. */
  milestones: 20,
  checkinNote: 300,
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

/**
 * How a key result is measured:
 * number = from a starting point to a target; milestones = a list of steps;
 * habit = N times a week; done = done or not done.
 */
export const GOAL_KINDS = ['number', 'milestones', 'habit', 'done'] as const
export const goalKindSchema = z.enum(GOAL_KINDS)
export type GoalKind = z.infer<typeof goalKindSchema>
export const GOAL_KIND_LABELS: Record<GoalKind, { label: string; hint: string }> = {
  number: { label: 'Number', hint: 'e.g. €10K saved' },
  milestones: { label: 'Steps', hint: 'e.g. Launch the website' },
  habit: { label: 'Habit', hint: 'e.g. 3 times a week' },
  done: { label: 'Done / not done', hint: 'e.g. Get the driving licence' },
}

/** Habit key results: routine-linked (ticks on Today) or ticked by hand on the goal. */
export const HABIT_MANUAL = 'manual'

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
const whySchema = z.string().trim().max(GOAL_LIMITS.why, tooLong(GOAL_LIMITS.why))
const milestoneTitleSchema = z
  .string()
  .trim()
  .min(1, 'Name the step')
  .max(GOAL_LIMITS.milestoneTitle, tooLong(GOAL_LIMITS.milestoneTitle))
const checkinNoteSchema = z.string().trim().max(GOAL_LIMITS.checkinNote, tooLong(GOAL_LIMITS.checkinNote))

/** A goal in words ("Become a better freelancer"); its key results say how it's measured. */
export const objectiveSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  title: titleSchema,
  why: whySchema.nullable().default(null),
  created_at: timestampSchema,
})
export type Objective = z.output<typeof objectiveSchema>

/**
 * A key result (the `goals` table). `target` means: number → the target;
 * habit → times a week (1–7); milestones / done → 1.
 */
export const goalSchema = z
  .object({
    id: z.uuid(),
    user_id: z.uuid(),
    /** Older backups lack it; the database then gives the key result its own objective. */
    objective_id: z.uuid().nullable().default(null),
    kind: goalKindSchema.default('number'),
    /** "done" key results: the day it was done. */
    completed_on: dateKeySchema.nullable().default(null),
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

/** One step of a milestones key result. */
export const milestoneSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  goal_id: z.uuid(),
  title: milestoneTitleSchema,
  due_date: dateKeySchema.nullable(),
  /** The day it was ticked done; null = still to do. */
  done_on: dateKeySchema.nullable(),
  position: z.number().int().min(0),
  created_at: timestampSchema,
})
export type Milestone = z.infer<typeof milestoneSchema>

/** "How confident am I about this goal?" 1–5, at most one per day. */
export const checkinSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  objective_id: z.uuid(),
  date: dateKeySchema,
  confidence: z.number().int().min(1).max(5),
  note: checkinNoteSchema.nullable(),
  created_at: timestampSchema,
})
export type Checkin = z.infer<typeof checkinSchema>

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

/** A number field that may be left empty (only some key result kinds need it). */
const optionalAmount = z.preprocess(
  looseNumber,
  z.coerce
    .number({ error: 'Enter a number' })
    .min(0, 'Use 0 or more')
    .max(GOAL_LIMITS.target, 'That number is too large')
    .optional(),
)

/** A new key result, ready to save. Steps without a name are left out. */
export type KeyResultDraft =
  | { kind: 'number'; title: string; unit: GoalUnit; start_value: number; target: number; start_date: DateKey; deadline: DateKey }
  | { kind: 'milestones'; title: string; start_date: DateKey; deadline: DateKey; steps: { title: string; due_date: DateKey | null }[] }
  /** routine_item_id null = ticked by hand on the goal. */
  | { kind: 'habit'; title: string; per_week: number; routine_item_id: string | null; start_date: DateKey; deadline: DateKey }
  | { kind: 'done'; title: string; start_date: DateKey; deadline: DateKey }

/**
 * The key result fields, flat so one form can switch between kinds.
 * Fields another kind uses are ignored (e.g. `target` for a habit).
 */
function keyResultShape(today: DateKey) {
  return {
    kind: goalKindSchema,
    kr_title: z.string().trim().max(GOAL_LIMITS.title, tooLong(GOAL_LIMITS.title)),
    unit: goalUnitSchema.default('eur'),
    start_value: optionalAmount,
    target: optionalAmount,
    per_week: optionalAmount,
    /** HABIT_MANUAL or a routine item id. */
    habit_source: z.string().default(HABIT_MANUAL),
    start_date: dateKeySchema.refine((date) => date <= today, 'The start can’t be in the future'),
    deadline: dateKeySchema.refine((date) => date > today, 'Pick a date after today'),
    steps: z
      .array(
        z.object({
          title: z.string().trim().max(GOAL_LIMITS.milestoneTitle, tooLong(GOAL_LIMITS.milestoneTitle)),
          due_date: z.string().refine((d) => d === '' || isDateKey(d), 'Enter a valid date'),
        }),
      )
      .max(GOAL_LIMITS.milestones, `Up to ${GOAL_LIMITS.milestones} steps`)
      .default([]),
  }
}

type KeyResultFields = z.output<z.ZodObject<ReturnType<typeof keyResultShape>>>

/** The checks that depend on the kind. `needsTitle`: the "Add key result" form has no objective name to fall back on. */
function checkKeyResult(v: KeyResultFields, ctx: z.RefinementCtx, needsTitle: boolean) {
  const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
  if (needsTitle && !v.kr_title) issue('kr_title', 'Name the key result')
  if (v.deadline <= v.start_date) issue('deadline', 'The deadline must be after the start date')
  if (v.kind === 'number') {
    if (v.target === undefined) issue('target', 'Enter a target')
    else if (v.target <= (v.start_value ?? 0)) issue('target', 'The target must be more than the starting point')
  }
  if (v.kind === 'habit') {
    const perWeek = v.per_week
    if (perWeek === undefined) issue('per_week', 'How many times a week?')
    else if (!Number.isInteger(perWeek) || perWeek < 1 || perWeek > 7) issue('per_week', 'Use a whole number from 1 to 7')
  }
  if (v.kind === 'milestones') {
    if (!v.steps.some((s) => s.title)) issue('steps', 'Add at least one step')
    v.steps.forEach((s, i) => {
      if (s.due_date && s.due_date > v.deadline) {
        ctx.addIssue({ code: 'custom', path: ['steps', i, 'due_date'], message: 'Pick a day on or before the deadline' })
      }
    })
  }
}

function toDraft(v: KeyResultFields, fallbackTitle: string): KeyResultDraft {
  const title = v.kr_title || fallbackTitle
  const dates = { start_date: v.start_date, deadline: v.deadline }
  switch (v.kind) {
    case 'number':
      return { kind: 'number', title, unit: v.unit, start_value: v.start_value ?? 0, target: v.target ?? 0, ...dates }
    case 'milestones':
      return {
        kind: 'milestones',
        title,
        ...dates,
        steps: v.steps.filter((s) => s.title).map((s) => ({ title: s.title, due_date: s.due_date || null })),
      }
    case 'habit':
      return {
        kind: 'habit',
        title,
        per_week: v.per_week ?? 1,
        routine_item_id: v.habit_source === HABIT_MANUAL ? null : v.habit_source,
        ...dates,
      }
    case 'done':
      return { kind: 'done', title, ...dates }
  }
}

/**
 * "New goal": the goal in words, why it matters, and its first key result.
 * The key result's name may be left empty: it then uses the goal's name.
 */
export function newObjectiveFormSchema(today: DateKey = getToday()) {
  return z
    .object({ title: titleSchema, why: whySchema, ...keyResultShape(today) })
    .superRefine((v, ctx) => checkKeyResult(v, ctx, false))
    .transform((v) => ({ objective: { title: v.title, why: v.why || null }, keyResult: toDraft(v, v.title) }))
}
export type NewObjectiveFormInput = z.input<ReturnType<typeof newObjectiveFormSchema>>
export type NewObjectiveFormValues = z.output<ReturnType<typeof newObjectiveFormSchema>>

/** "Add key result" to an existing goal. */
export function keyResultFormSchema(today: DateKey = getToday()) {
  return z
    .object(keyResultShape(today))
    .superRefine((v, ctx) => checkKeyResult(v, ctx, true))
    .transform((v) => toDraft(v, v.kr_title))
}
export type KeyResultFormInput = z.input<ReturnType<typeof keyResultFormSchema>>
export type KeyResultFormValues = z.output<ReturnType<typeof keyResultFormSchema>>

/** "Edit goal": its name and why it matters. */
export const objectiveFormSchema = z.object({
  title: titleSchema,
  why: whySchema.transform((why) => why || null),
})
export type ObjectiveFormInput = z.input<typeof objectiveFormSchema>
export type ObjectiveFormValues = z.output<typeof objectiveFormSchema>

/** "Add step" on a milestones key result. */
export const milestoneFormSchema = z.object({
  title: milestoneTitleSchema,
  due_date: z
    .string()
    .refine((d) => d === '' || isDateKey(d), 'Enter a valid date')
    .transform((d) => d || null),
})
export type MilestoneFormInput = z.input<typeof milestoneFormSchema>
export type MilestoneFormValues = z.output<typeof milestoneFormSchema>

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
