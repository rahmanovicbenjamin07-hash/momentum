import { z } from 'zod'
import { dayIndex, isDateKey } from '@/lib/dates'
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

export const IMPROVE_LIMITS = {
  reviewText: 1000,
  lessonText: 500,
  experimentTitle: 120,
  hypothesis: 500,
  result: 500,
  ideaText: 300,
} as const

const tooLong = (max: number) => `Keep it under ${max} characters`

/** Treats "", whitespace, null and NaN (empty number input) as "not filled in". */
const blankToUndefined = (value: unknown) =>
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (typeof value === 'number' && Number.isNaN(value))
    ? undefined
    : value

/** Text that may be empty (stored as ""). */
const freeText = (max: number) => z.string().max(max, tooLong(max))
/** Form text that may be empty: trimmed, "" allowed. */
const optionalFormText = (max: number) => z.string().trim().max(max, tooLong(max)).default('')
/** Form text that must be filled in. */
const requiredText = (max: number, emptyMessage: string) =>
  z.string().trim().min(1, emptyMessage).max(max, tooLong(max))

/** A Monday as "yyyy-MM-dd" (weeks start on Monday). */
export const mondaySchema = z
  .string()
  .refine(isDateKey, 'Enter a valid date')
  .refine((date) => dayIndex(date) === 0, 'A week starts on a Monday')

const endAfterStart = <T extends { start_date: string; end_date: string }>(value: T) => value.end_date > value.start_date
const endAfterStartIssue = { message: 'The end date must be after the start date', path: ['end_date'] }

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const REVIEW_STATUSES = ['draft', 'saved'] as const
export const reviewStatusSchema = z.enum(REVIEW_STATUSES)
export type ReviewStatus = z.infer<typeof reviewStatusSchema>

export const LESSON_AREAS = ['Outreach', 'Routine', 'Work', 'Health', 'Other'] as const
export const lessonAreaSchema = z.enum(LESSON_AREAS)
export type LessonArea = z.infer<typeof lessonAreaSchema>

export const EXPERIMENT_METRICS = ['reply_rate', 'task_completion', 'outreach_sent', 'routine_rate'] as const
export const experimentMetricSchema = z.enum(EXPERIMENT_METRICS)
export type ExperimentMetric = z.infer<typeof experimentMetricSchema>
export const EXPERIMENT_METRIC_LABELS: Record<ExperimentMetric, string> = {
  reply_rate: 'Reply rate',
  task_completion: 'Task completion',
  outreach_sent: 'Outreach sent',
  routine_rate: 'Routine done',
}

export const EXPERIMENT_STATUSES = ['running', 'kept', 'dropped'] as const
export const experimentStatusSchema = z.enum(EXPERIMENT_STATUSES)
export type ExperimentStatus = z.infer<typeof experimentStatusSchema>

export const IDEA_STATUSES = ['new', 'testing', 'done', 'dropped'] as const
export const ideaStatusSchema = z.enum(IDEA_STATUSES)
export type IdeaStatus = z.infer<typeof ideaStatusSchema>

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

/** The week's numbers, saved with the review so it stays as it was. */
export const statsSnapshotSchema = z.object({
  /** 0–100. */
  task_completion: z.number().min(0).max(100),
  outreach_sent: z.number().int().min(0),
  replies: z.number().int().min(0),
  meetings: z.number().int().min(0),
})
export type StatsSnapshot = z.infer<typeof statsSnapshotSchema>

export const reviewSchema = z.object({
  ...rowBase,
  week_start: mondaySchema,
  wins: freeText(IMPROVE_LIMITS.reviewText),
  misses: freeText(IMPROVE_LIMITS.reviewText),
  lesson: freeText(IMPROVE_LIMITS.reviewText),
  focus: freeText(IMPROVE_LIMITS.reviewText),
  status: reviewStatusSchema,
  stats_snapshot: statsSnapshotSchema,
})
export type Review = z.infer<typeof reviewSchema>

export const lessonSchema = z.object({
  ...rowBase,
  area: lessonAreaSchema,
  text: z.string().trim().min(1).max(IMPROVE_LIMITS.lessonText),
})
export type Lesson = z.infer<typeof lessonSchema>

export const experimentSchema = z
  .object({
    ...rowBase,
    title: z.string().trim().min(1).max(IMPROVE_LIMITS.experimentTitle),
    hypothesis: freeText(IMPROVE_LIMITS.hypothesis),
    metric: experimentMetricSchema,
    start_date: dateKeySchema,
    end_date: dateKeySchema,
    status: experimentStatusSchema,
    /** The metric before the experiment, and during it (null until measured). */
    before_value: z.number().nullable(),
    during_value: z.number().nullable(),
    result: freeText(IMPROVE_LIMITS.result),
  })
  .refine(endAfterStart, endAfterStartIssue)
export type Experiment = z.infer<typeof experimentSchema>

export const ideaSchema = z.object({
  ...rowBase,
  text: z.string().trim().min(1).max(IMPROVE_LIMITS.ideaText),
  status: ideaStatusSchema,
})
export type Idea = z.infer<typeof ideaSchema>

/** Weekly targets (stored in profiles.weekly_targets). */
export const weeklyTargetsSchema = z.object({
  outreaches: z.number().int().min(1).max(200),
  /** Percent, 1–100. */
  task_completion: z.number().int().min(1).max(100),
  meetings: z.number().int().min(0).max(50),
})
export type WeeklyTargets = z.infer<typeof weeklyTargetsSchema>

// ---------------------------------------------------------------------------
// Forms
// With React Hook Form: useForm<XFormInput, unknown, XFormValues>.
// ---------------------------------------------------------------------------

/** Weekly review: four free-text answers, any of them may be empty. */
export const reviewFormSchema = z.object({
  wins: optionalFormText(IMPROVE_LIMITS.reviewText),
  misses: optionalFormText(IMPROVE_LIMITS.reviewText),
  lesson: optionalFormText(IMPROVE_LIMITS.reviewText),
  focus: optionalFormText(IMPROVE_LIMITS.reviewText),
})
export type ReviewFormInput = z.input<typeof reviewFormSchema>
export type ReviewFormValues = z.output<typeof reviewFormSchema>

export const lessonFormSchema = z.object({
  area: lessonAreaSchema.default('Other'),
  text: requiredText(IMPROVE_LIMITS.lessonText, 'Write the lesson'),
})
export type LessonFormInput = z.input<typeof lessonFormSchema>
export type LessonFormValues = z.output<typeof lessonFormSchema>

export const experimentFormSchema = z
  .object({
    title: requiredText(IMPROVE_LIMITS.experimentTitle, 'Name the experiment'),
    hypothesis: optionalFormText(IMPROVE_LIMITS.hypothesis),
    metric: experimentMetricSchema.default('reply_rate'),
    start_date: dateKeySchema,
    end_date: dateKeySchema,
  })
  .refine(endAfterStart, endAfterStartIssue)
export type ExperimentFormInput = z.input<typeof experimentFormSchema>
export type ExperimentFormValues = z.output<typeof experimentFormSchema>

export const ideaFormSchema = z.object({
  text: requiredText(IMPROVE_LIMITS.ideaText, 'Write the idea'),
})
export type IdeaFormInput = z.input<typeof ideaFormSchema>
export type IdeaFormValues = z.output<typeof ideaFormSchema>

/** Whole number from a text or number input, within min–max. */
const wholeNumber = (min: number, max: number, emptyMessage: string) =>
  z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ error: emptyMessage })
      .int('Use a whole number')
      .min(min, `At least ${min}`)
      .max(max, `At most ${max}`),
  )

export const weeklyTargetsFormSchema = z.object({
  outreaches: wholeNumber(1, 200, 'Enter a number of outreaches'),
  task_completion: wholeNumber(1, 100, 'Enter a percentage'),
  meetings: wholeNumber(0, 50, 'Enter a number of meetings'),
})
export type WeeklyTargetsFormInput = z.input<typeof weeklyTargetsFormSchema>
export type WeeklyTargetsFormValues = z.output<typeof weeklyTargetsFormSchema>
