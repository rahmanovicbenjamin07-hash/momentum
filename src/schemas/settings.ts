import { z } from 'zod'
import { weeklyTargetsSchema } from './improve'
import { hhmmSchema } from './today'

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

// ---------------------------------------------------------------------------
// Profile settings
// ---------------------------------------------------------------------------

export const THEMES = ['light', 'dark', 'system'] as const
export const themeSchema = z.enum(THEMES)
export type Theme = z.infer<typeof themeSchema>

/** 1 = Monday (default), 0 = Sunday. */
export const weekStartSchema = z.union([z.literal(1), z.literal(0)])
export type WeekStart = z.infer<typeof weekStartSchema>

/** Hour the day ends: midnight, 02:00 or 04:00 (night owls). */
export const DAY_END_HOURS = [0, 2, 4] as const
export const dayEndHourSchema = z.union([z.literal(0), z.literal(2), z.literal(4)])
export type DayEndHour = z.infer<typeof dayEndHourSchema>

export const LANGUAGES = ['en'] as const
export const languageSchema = z.enum(LANGUAGES)

export const profileSettingsSchema = z.object({
  theme: themeSchema,
  week_start: weekStartSchema,
  day_end_hour: dayEndHourSchema,
  language: languageSchema,
  backup_enabled: z.boolean(),
  weekly_targets: weeklyTargetsSchema,
})
export type ProfileSettings = z.infer<typeof profileSettingsSchema>

// ---------------------------------------------------------------------------
// Notification preferences
// ---------------------------------------------------------------------------

export const FIXED_NOTIFICATION_KEYS = [
  'master',
  'anytime',
  'followups',
  'close_day',
  'weekly_review',
  'email_summary',
  'quiet_hours',
] as const
export type FixedNotificationKey = (typeof FIXED_NOTIFICATION_KEYS)[number]
/** One fixed key, or "routine:<routine item id>" for a routine reminder. */
export type NotificationKey = FixedNotificationKey | `routine:${string}`

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isNotificationKey(value: string): value is NotificationKey {
  if ((FIXED_NOTIFICATION_KEYS as readonly string[]).includes(value)) return true
  return value.startsWith('routine:') && UUID_RE.test(value.slice('routine:'.length))
}

export const notificationKeySchema = z
  .string()
  .refine(isNotificationKey, 'Unknown notification setting')
  .transform((value) => value as NotificationKey)

export const notificationPrefSchema = z
  .object({
    id: z.uuid(),
    user_id: z.uuid(),
    key: notificationKeySchema,
    enabled: z.boolean(),
    /** When it fires ("HH:MM"); for quiet_hours, when quiet time starts. null = no time. */
    time: hhmmSchema.nullable(),
    /** Only for quiet_hours: when quiet time ends. */
    time_end: hhmmSchema.nullable(),
  })
  .refine((pref) => pref.key === 'quiet_hours' || pref.time_end === null, {
    message: 'Only quiet hours have an end time',
    path: ['time_end'],
  })
export type NotificationPref = z.infer<typeof notificationPrefSchema>

// ---------------------------------------------------------------------------
// Notifications (the bell)
// ---------------------------------------------------------------------------

export const NOTIFICATION_KINDS = ['followup_due', 'followup_late', 'routine', 'anytime', 'close_day', 'weekly_review'] as const
export const notificationKindSchema = z.enum(NOTIFICATION_KINDS)
export type NotificationKind = z.infer<typeof notificationKindSchema>

export const notificationSchema = z.object({
  ...rowBase,
  kind: notificationKindSchema,
  title: z.string().trim().min(1).max(120),
  body: z.string().max(300),
  /** In-app path to open, e.g. "/outreach/<id>"; null = nowhere to go. */
  link: z.string().max(500).nullable(),
  read_at: timestampSchema.nullable(),
  /** Stops the same reminder being sent twice, e.g. "followup_due:<contact id>:2026-10-28". */
  dedupe_key: z.string().min(1).max(200),
})
export type Notification = z.infer<typeof notificationSchema>
