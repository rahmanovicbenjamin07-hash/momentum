import { z } from 'zod'
import { isDateKey } from '@/lib/dates'

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

/** Calendar day "yyyy-MM-dd" (Postgres `date`). */
export const dateKeySchema = z.string().refine(isDateKey, 'Enter a valid date')

/** "HH:MM", 00:00–23:59. What forms send. */
export const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour time, e.g. 09:30 or 21:15')

/** Postgres `time` comes back as "HH:MM:SS"; "HH:MM" is accepted too. */
export const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Invalid time')

/** Postgres timestamptz, e.g. "2026-10-28T19:19:45.123456+00:00". */
const timestampSchema = z.iso.datetime({ offset: true })

const titleSchema = z.string().trim().min(1, 'Enter a title').max(200, 'Keep it under 200 characters')
/** Task / repeating-task description (tasks.notes, routine_items.notes). */
const notesSchema = z.string().max(2000, 'Keep the description under 2000 characters')
const positionSchema = z.number().int().min(0)

/** Every table has these (see CLAUDE.md → Security). */
const rowBase = {
  id: z.uuid(),
  user_id: z.uuid(),
  created_at: timestampSchema,
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const PRIORITIES = ['low', 'medium', 'high'] as const
export const prioritySchema = z.enum(PRIORITIES)
export type Priority = z.infer<typeof prioritySchema>

export const TASK_STATUSES = ['todo', 'done', 'dropped'] as const
export const taskStatusSchema = z.enum(TASK_STATUSES)
export type TaskStatus = z.infer<typeof taskStatusSchema>

export const MISS_REASONS = ['Tired', 'No time', 'Travel', 'Sick', 'Forgot', 'Other'] as const
export const missReasonSchema = z.enum(MISS_REASONS)
export type MissReason = z.infer<typeof missReasonSchema>

/** every_week = once a week, on the weekday of the task's day. */
export const REPEAT_OPTIONS = ['just_today', 'weekdays', 'every_day', 'weekends', 'every_week'] as const
export const repeatSchema = z.enum(REPEAT_OPTIONS)
export type Repeat = z.infer<typeof repeatSchema>

/** Tag without "#", e.g. "outreach". */
export const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(32, 'Keep tags under 32 characters')
  .regex(/^[^\s#]+$/, 'Tags have no spaces or #')

/** Mon..Sun, exactly 7 booleans. */
export const weekdaysSchema = z.array(z.boolean()).length(7, 'Days must have 7 entries (Mon–Sun)')

// ---------------------------------------------------------------------------
// Table rows (docs/phase-1-today.md → Tables)
// ---------------------------------------------------------------------------

export const routineItemSchema = z.object({
  ...rowBase,
  title: titleSchema,
  days: weekdaysSchema,
  time: timeOfDaySchema.nullable(),
  /** End of a time range (time–end_time). Missing on rows loaded before the column existed. */
  end_time: timeOfDaySchema.nullable().optional(),
  position: positionSchema,
  active: z.boolean(),
  /** Optional description. Missing on rows loaded before the column existed. */
  notes: notesSchema.nullable().optional(),
})
export type RoutineItem = z.infer<typeof routineItemSchema>

export const routineCheckSchema = z.object({
  ...rowBase,
  routine_item_id: z.uuid(),
  date: dateKeySchema,
  done: z.boolean(),
  miss_reason: missReasonSchema.nullable(),
})
export type RoutineCheck = z.infer<typeof routineCheckSchema>

export const taskSchema = z.object({
  ...rowBase,
  title: titleSchema,
  notes: notesSchema.nullable(),
  due_date: dateKeySchema,
  time: timeOfDaySchema.nullable(),
  /** End of a time range (time–end_time). Missing on rows loaded before the column existed. */
  end_time: timeOfDaySchema.nullable().optional(),
  tag: tagSchema.nullable(),
  priority: prioritySchema,
  status: taskStatusSchema,
  completed_at: timestampSchema.nullable(),
  position: positionSchema,
  contact_id: z.uuid().nullable(),
})
export type Task = z.infer<typeof taskSchema>

export const energySchema = z.number().int().min(1, 'Energy is 1–5').max(5, 'Energy is 1–5')

export const dailyLogSchema = z.object({
  ...rowBase,
  date: dateKeySchema,
  note: z.string().max(5000).nullable(),
  energy: energySchema.nullable(),
})
export type DailyLog = z.infer<typeof dailyLogSchema>

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

/**
 * A time range on a form: an end time needs a start time and must be later the same day.
 * Times are "HH:MM", so comparing the strings compares the times. Empty = null/undefined.
 */
export function timeRangeIssue(time: string | null | undefined, endTime: string | null | undefined): string | null {
  if (!endTime) return null
  if (!time) return 'Set a start time first'
  return endTime > time ? null : 'End time must be after the start time'
}

/** Which day a one-off task from the quick-add bar is for. */
export const QUICK_ADD_DAYS = ['today', 'tomorrow', 'date'] as const
export const quickAddDaySchema = z.enum(QUICK_ADD_DAYS)
export type QuickAddDay = z.infer<typeof quickAddDaySchema>

/**
 * Quick-add bar. The time and date inputs send "" when empty; that becomes undefined.
 * `endTime` (optional) makes it a range, e.g. 08:00–11:00.
 * `date` is only needed when `day` is "date" (Pick a date) and the task doesn't repeat.
 * With React Hook Form: useForm<QuickAddFormInput, unknown, QuickAddFormValues>.
 */
export const quickAddFormSchema = z
  .object({
    text: z.string().trim().min(1, 'Type a task').max(200, 'Keep it under 200 characters'),
    time: z
      .union([z.literal(''), hhmmSchema])
      .optional()
      .transform((value) => value || undefined),
    endTime: z
      .union([z.literal(''), hhmmSchema])
      .optional()
      .transform((value) => value || undefined),
    repeat: repeatSchema.default('just_today'),
    day: quickAddDaySchema.default('today'),
    date: z
      .union([z.literal(''), dateKeySchema])
      .optional()
      .transform((value) => value || undefined),
  })
  .refine((v) => v.repeat !== 'just_today' || v.day !== 'date' || v.date !== undefined, {
    message: 'Pick a date',
    path: ['date'],
  })
  .superRefine((v, ctx) => {
    const issue = timeRangeIssue(v.time, v.endTime)
    if (issue) ctx.addIssue({ code: 'custom', message: issue, path: ['endTime'] })
  })
export type QuickAddFormInput = z.input<typeof quickAddFormSchema>
export type QuickAddFormValues = z.output<typeof quickAddFormSchema>

/**
 * Task pop-up (click a task or its pencil) for a task or repeating item. Empty time = Anytime (null);
 * empty end time = just a start time.
 * `date` is used for one-off tasks, `days` for repeating items; the other just keeps its starting value.
 */
export const editItemFormSchema = z
  .object({
    title: titleSchema,
    /** Empty = no description (null). */
    notes: notesSchema.transform((value) => value.trim() || null),
    time: z.union([z.literal(''), hhmmSchema]).transform((value) => value || null),
    endTime: z.union([z.literal(''), hhmmSchema]).transform((value) => value || null),
    date: dateKeySchema,
    days: weekdaysSchema.refine((days) => days.some(Boolean), 'Pick at least one day'),
  })
  .superRefine((v, ctx) => {
    const issue = timeRangeIssue(v.time, v.endTime)
    if (issue) ctx.addIssue({ code: 'custom', message: issue, path: ['endTime'] })
  })
export type EditItemFormInput = z.input<typeof editItemFormSchema>
export type EditItemFormValues = z.output<typeof editItemFormSchema>

/** Daily note (autosaved) + energy buttons. Energy is null until picked. */
export const dailyNoteFormSchema = z.object({
  note: z.string().max(5000, 'Keep the note under 5000 characters'),
  energy: energySchema.nullable(),
})
export type DailyNoteFormValues = z.infer<typeof dailyNoteFormSchema>

// ---------------------------------------------------------------------------
// View model: one row in "Today's tasks" (routine item or one-off task)
// ---------------------------------------------------------------------------

export const todayItemSchema = z.object({
  kind: z.enum(['routine', 'task']),
  id: z.uuid(),
  title: titleSchema,
  /** "HH:MM", or null for "Anytime". */
  time: hhmmSchema.nullable(),
  /** "HH:MM" end of a range (time–endTime); null/missing = just a start time. */
  endTime: hhmmSchema.nullable().optional(),
  done: z.boolean(),
  /** Marked "Not done" (✗): a dropped task, or a repeating item with a miss reason. Counts as not done. */
  missed: z.boolean().optional(),
  /** Description, null/missing when there is none. */
  notes: notesSchema.nullable().optional(),
  /** Routine items only: Mon..Sun. */
  days: weekdaysSchema.optional(),
  /** One-off tasks only. */
  tag: tagSchema.nullable().optional(),
  /** One-off tasks only. */
  priority: prioritySchema.optional(),
  /** Saved order (routine items and one-off tasks each keep their own); used by "My order". */
  position: positionSchema.optional(),
})
export type TodayItem = z.infer<typeof todayItemSchema>
export type TodayItemKind = TodayItem['kind']

/** The ✓ / ✗ buttons on a row: still open, done, or not done. */
export type TodayItemStatus = 'open' | 'done' | 'missed'

export function itemStatus(item: Pick<TodayItem, 'done' | 'missed'>): TodayItemStatus {
  if (item.done) return 'done'
  return item.missed ? 'missed' : 'open'
}
