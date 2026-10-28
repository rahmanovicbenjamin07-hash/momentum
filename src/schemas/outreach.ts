import { z } from 'zod'
import { hostIs, toHttpUrl } from '@/lib/outreach'
import { dateKeySchema, prioritySchema, tagSchema } from './today'

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

export const LIMITS = {
  name: 120,
  company: 120,
  role: 120,
  category: 80,
  city: 120,
  phone: 40,
  email: 254,
  url: 2000,
  metWhere: 200,
  jobTitle: 200,
  lostReason: 500,
  note: 2000,
  touchBody: 5000,
  templateName: 80,
  templateBody: 5000,
  tags: 20,
  money: 10_000_000,
  connects: 1000,
} as const

const tooLong = (max: number) => `Keep it under ${max} characters`

/** Required text: trimmed, not empty. */
const requiredText = (max: number, emptyMessage: string) =>
  z.string().trim().min(1, emptyMessage).max(max, tooLong(max))

/** Optional text input: "" (empty input) becomes undefined. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, tooLong(max))
    .optional()
    .transform((value) => value || undefined)

type LinkOptions = { domains?: readonly string[]; domainMessage?: string }

function checkLink(value: string, ctx: z.RefinementCtx, { domains, domainMessage }: LinkOptions): string {
  const url = toHttpUrl(value)
  if (!url) {
    ctx.issues.push({ code: 'custom', message: 'Enter a valid link', input: value })
    return value
  }
  if (domains && !hostIs(url, domains)) {
    ctx.issues.push({ code: 'custom', message: domainMessage ?? 'Enter a valid link', input: value })
  }
  return url
}

/** Link the user must fill in. "linkedin.com/in/x" is accepted and becomes "https://linkedin.com/in/x". */
const requiredLink = (options: LinkOptions = {}) =>
  z
    .string()
    .trim()
    .min(1, 'Paste the link')
    .max(LIMITS.url, tooLong(LIMITS.url))
    .transform((value, ctx) => checkLink(value, ctx, options))

/** Optional link: "" becomes undefined, anything else must be a valid link. */
const optionalLink = (options: LinkOptions = {}) =>
  z
    .string()
    .trim()
    .max(LIMITS.url, tooLong(LIMITS.url))
    .optional()
    .transform((value, ctx) => (value ? checkLink(value, ctx, options) : undefined))

const LINKEDIN = { domains: ['linkedin.com'], domainMessage: 'Use a linkedin.com link' }
const MAPS = {
  domains: ['google.com', 'maps.app.goo.gl', 'goo.gl', 'g.page'],
  domainMessage: 'Use a Google Maps link',
}
const UPWORK = { domains: ['upwork.com'], domainMessage: 'Use an upwork.com link' }

const PHONE_RE = /^\+?[\d\s()./-]{6,40}$/

const optionalPhone = optionalText(LIMITS.phone).refine(
  (value) => value === undefined || (PHONE_RE.test(value) && /\d{6}/.test(value.replace(/\D/g, ''))),
  'Enter a valid phone number',
)

const optionalEmail = optionalText(LIMITS.email).refine(
  (value) => value === undefined || z.email().safeParse(value).success,
  'Enter a valid email address',
)

/** Treats "", whitespace, null and NaN (empty number input) as "not filled in". */
const blankToUndefined = (value: unknown) =>
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (typeof value === 'number' && Number.isNaN(value))
    ? undefined
    : value

/** Optional € amount from a text or number input. */
const optionalMoney = z.preprocess(
  blankToUndefined,
  z.coerce
    .number({ error: 'Enter a number' })
    .min(0, 'Can’t be negative')
    .max(LIMITS.money, 'That amount is too large')
    .optional(),
)

const optionalConnects = z.preprocess(
  blankToUndefined,
  z.coerce
    .number({ error: 'Enter a number' })
    .int('Use a whole number')
    .min(0, 'Can’t be negative')
    .max(LIMITS.connects, `Max ${LIMITS.connects}`)
    .optional(),
)

/** "yyyy-MM", what `<input type="month">` sends. */
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Pick a month')

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const SOURCES = ['linkedin', 'maps', 'inperson', 'upwork', 'other'] as const
export const sourceSchema = z.enum(SOURCES)
export type Source = z.infer<typeof sourceSchema>
export const SOURCE_LABELS: Record<Source, string> = {
  linkedin: 'LinkedIn',
  maps: 'Google Maps',
  inperson: 'In person',
  upwork: 'Upwork',
  other: 'Other',
}

export const STAGES = ['new', 'contacted', 'replied', 'meeting', 'proposal', 'won', 'lost'] as const
export const stageSchema = z.enum(STAGES)
export type Stage = z.infer<typeof stageSchema>
export const STAGE_LABELS: Record<Stage, string> = {
  new: 'New',
  contacted: 'Contacted',
  replied: 'Replied',
  meeting: 'Meeting',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
}

export const DIRECTIONS = ['sent', 'received', 'note'] as const
export const directionSchema = z.enum(DIRECTIONS)
export type Direction = z.infer<typeof directionSchema>

export const PROPOSAL_STATUSES = ['sent', 'viewed', 'interview', 'hired'] as const
export const proposalStatusSchema = z.enum(PROPOSAL_STATUSES)
export type ProposalStatus = z.infer<typeof proposalStatusSchema>

/** How we reach a lead / how a touch happened. */
export const CHANNELS = ['email', 'linkedin', 'phone', 'whatsapp', 'upwork', 'inperson', 'other'] as const
export const channelSchema = z.enum(CHANNELS)
export type Channel = z.infer<typeof channelSchema>
export const CHANNEL_LABELS: Record<Channel, string> = {
  email: 'Email',
  linkedin: 'LinkedIn',
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  upwork: 'Upwork',
  inperson: 'In person',
  other: 'Other',
}

/** First follow-up choice on Add lead. */
export const FOLLOW_UP_CHOICES = ['tomorrow', '3_days', 'week'] as const
export const followUpChoiceSchema = z.enum(FOLLOW_UP_CHOICES)
export type FollowUpChoice = z.infer<typeof followUpChoiceSchema>

// ---------------------------------------------------------------------------
// Table rows (docs/phase-2-outreach.md → Tables)
// ---------------------------------------------------------------------------

/** One entry in `contacts.notes` (jsonb array). */
export const contactNoteSchema = z.object({
  id: z.uuid(),
  body: requiredText(LIMITS.note, 'Write a note'),
  created_at: timestampSchema,
})
export type ContactNote = z.infer<typeof contactNoteSchema>

const text = (max: number) => z.string().max(max).nullable()
const money = z.number().min(0).max(LIMITS.money).nullable()

export const contactSchema = z.object({
  ...rowBase,
  source: sourceSchema,
  name: requiredText(LIMITS.name, 'Enter a name'),
  company: text(LIMITS.company),
  role: text(LIMITS.role),
  category: text(LIMITS.category),
  city: text(LIMITS.city),
  phone: text(LIMITS.phone),
  email: text(LIMITS.email),
  website: text(LIMITS.url),
  linkedin_url: text(LIMITS.url),
  maps_url: text(LIMITS.url),
  met_where: text(LIMITS.metWhere),
  upwork_job_title: text(LIMITS.jobTitle),
  upwork_job_url: text(LIMITS.url),
  upwork_budget: money,
  connects_spent: z.number().int().min(0).max(LIMITS.connects).nullable(),
  proposal_status: proposalStatusSchema.nullable(),
  stage: stageSchema,
  channel: channelSchema.nullable(),
  priority: prioritySchema,
  deal_value: money,
  won_amount: money,
  /** First day of the month the deal was paid, e.g. "2026-10-01". */
  won_month: dateKeySchema.nullable(),
  next_follow_up: dateKeySchema.nullable(),
  last_touch_at: timestampSchema.nullable(),
  lost_reason: text(LIMITS.lostReason),
  notes: z.array(contactNoteSchema).max(500),
  tags: z.array(tagSchema).max(LIMITS.tags),
})
export type Contact = z.infer<typeof contactSchema>

export const touchSchema = z.object({
  ...rowBase,
  contact_id: z.uuid(),
  occurred_at: timestampSchema,
  channel: channelSchema,
  direction: directionSchema,
  template_id: z.uuid().nullable(),
  body: text(LIMITS.touchBody),
  got_reply: z.boolean(),
})
export type Touch = z.infer<typeof touchSchema>

export const stageHistorySchema = z.object({
  ...rowBase,
  contact_id: z.uuid(),
  /** null for the first entry (lead created). */
  from_stage: stageSchema.nullable(),
  to_stage: stageSchema,
  changed_at: timestampSchema,
})
export type StageHistory = z.infer<typeof stageHistorySchema>

export const templateSchema = z.object({
  ...rowBase,
  name: requiredText(LIMITS.templateName, 'Name the template'),
  /** null = works for any channel. */
  channel: channelSchema.nullable(),
  body: requiredText(LIMITS.templateBody, 'Write the message'),
})
export type Template = z.infer<typeof templateSchema>

// ---------------------------------------------------------------------------
// Forms
// With React Hook Form: useForm<XFormInput, unknown, XFormValues>.
// ---------------------------------------------------------------------------

const followUp = { follow_up: followUpChoiceSchema.default('3_days') }

const linkedinLead = z.object({
  source: z.literal('linkedin'),
  name: requiredText(LIMITS.name, 'Enter their name'),
  company: optionalText(LIMITS.company),
  role: optionalText(LIMITS.role),
  linkedin_url: requiredLink(LINKEDIN),
  ...followUp,
})

const mapsLead = z.object({
  source: z.literal('maps'),
  /** Business name. */
  name: requiredText(LIMITS.name, 'Enter the business name'),
  /** Business type, e.g. "Dentist". */
  category: optionalText(LIMITS.category),
  /** Address or city. */
  city: optionalText(LIMITS.city),
  phone: optionalPhone,
  /** Empty ⇒ the lead gets the "no-website" tag. */
  website: optionalLink(),
  maps_url: optionalLink(MAPS),
  ...followUp,
})

const inPersonLead = z
  .object({
    source: z.literal('inperson'),
    name: requiredText(LIMITS.name, 'Enter their name'),
    company: optionalText(LIMITS.company),
    met_where: optionalText(LIMITS.metWhere),
    phone: optionalPhone,
    email: optionalEmail,
    ...followUp,
  })
  .refine((lead) => lead.phone !== undefined || lead.email !== undefined, {
    message: 'Add a phone number or email',
    path: ['phone'],
  })

const upworkLead = z.object({
  source: z.literal('upwork'),
  upwork_job_title: requiredText(LIMITS.jobTitle, 'Enter the job title'),
  /** Often hidden on Upwork, so optional; the job title is used as the name then. */
  client_name: optionalText(LIMITS.name),
  upwork_budget: optionalMoney,
  connects_spent: optionalConnects,
  upwork_job_url: requiredLink(UPWORK),
  proposal_status: proposalStatusSchema.default('sent'),
  ...followUp,
})

const otherLead = z.object({
  source: z.literal('other'),
  name: requiredText(LIMITS.name, 'Enter a name'),
  company: optionalText(LIMITS.company),
  email: optionalEmail,
  phone: optionalPhone,
  website: optionalLink(),
  ...followUp,
})

/** Add lead: pick a source first; the fields depend on it. Turn into a row with `leadToContact`. */
export const addLeadFormSchema = z.discriminatedUnion('source', [
  linkedinLead,
  mapsLead,
  inPersonLead,
  upworkLead,
  otherLead,
])
export type AddLeadFormInput = z.input<typeof addLeadFormSchema>
export type AddLeadFormValues = z.output<typeof addLeadFormSchema>

/** Log a touch on the contact page. A note needs text; a sent/received message may be blank. */
export const logTouchFormSchema = z
  .object({
    channel: channelSchema,
    direction: directionSchema,
    template_id: z
      .union([z.literal(''), z.uuid()])
      .optional()
      .transform((value) => value || undefined),
    body: optionalText(LIMITS.touchBody),
    got_reply: z.boolean().default(false),
  })
  .refine((touch) => touch.direction !== 'note' || touch.body !== undefined, {
    message: 'Write the note',
    path: ['body'],
  })
export type LogTouchFormInput = z.input<typeof logTouchFormSchema>
export type LogTouchFormValues = z.output<typeof logTouchFormSchema>

/** Won dialog: amount in € (> 0) and the month it was paid ("yyyy-MM"; store as `${month}-01`). */
export const wonDealFormSchema = z.object({
  amount: z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ error: 'Enter the amount' })
      .positive('Amount must be more than 0')
      .max(LIMITS.money, 'That amount is too large'),
  ),
  month: monthSchema,
})
export type WonDealFormInput = z.input<typeof wonDealFormSchema>
export type WonDealFormValues = z.output<typeof wonDealFormSchema>

export const templateFormSchema = z.object({
  name: requiredText(LIMITS.templateName, 'Name the template'),
  channel: z
    .union([z.literal(''), channelSchema])
    .optional()
    .transform((value) => value || undefined),
  body: requiredText(LIMITS.templateBody, 'Write the message'),
})
export type TemplateFormInput = z.input<typeof templateFormSchema>
export type TemplateFormValues = z.output<typeof templateFormSchema>
