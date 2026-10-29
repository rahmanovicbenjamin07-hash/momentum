import { z } from 'zod'
import {
  CHANNEL_LABELS,
  CHANNELS,
  PROPOSAL_STATUSES,
  SOURCE_LABELS,
  SOURCES,
  STAGE_LABELS,
  STAGES,
  type Contact,
} from '@/schemas/outreach'
import { PRIORITIES, tagSchema } from '@/schemas/today'
import { isDateKey } from './dates'
import { toHttpUrl } from './outreach'

// ---------------------------------------------------------------------------
// Columns (same order for export and the import template)
// ---------------------------------------------------------------------------

/** Contact fields that go in and out of CSV. ids, notes and timestamps stay in the app. */
export const CSV_COLUMNS = [
  { key: 'name', header: 'Name' },
  { key: 'source', header: 'Source' },
  { key: 'stage', header: 'Stage' },
  { key: 'company', header: 'Company' },
  { key: 'role', header: 'Role' },
  { key: 'category', header: 'Category' },
  { key: 'city', header: 'City' },
  { key: 'phone', header: 'Phone' },
  { key: 'email', header: 'Email' },
  { key: 'website', header: 'Website' },
  { key: 'linkedin_url', header: 'LinkedIn URL' },
  { key: 'maps_url', header: 'Google Maps URL' },
  { key: 'met_where', header: 'Met where' },
  { key: 'upwork_job_title', header: 'Upwork job title' },
  { key: 'upwork_job_url', header: 'Upwork job URL' },
  { key: 'upwork_budget', header: 'Upwork budget' },
  { key: 'connects_spent', header: 'Connects spent' },
  { key: 'proposal_status', header: 'Proposal status' },
  { key: 'channel', header: 'Channel' },
  { key: 'priority', header: 'Priority' },
  { key: 'deal_value', header: 'Deal value' },
  { key: 'won_amount', header: 'Won amount' },
  { key: 'won_month', header: 'Won month' },
  { key: 'next_follow_up', header: 'Next follow-up' },
  { key: 'lost_reason', header: 'Lost reason' },
  { key: 'tags', header: 'Tags' },
] as const satisfies readonly { key: keyof Contact; header: string }[]

export type CsvKey = (typeof CSV_COLUMNS)[number]['key']

/** Extra header spellings people use in their own spreadsheets (compared after `headerKey`). */
const HEADER_ALIASES: Record<string, CsvKey> = {
  full_name: 'name',
  contact: 'name',
  contact_name: 'name',
  business: 'name',
  business_name: 'name',
  client: 'name',
  client_name: 'name',
  organisation: 'company',
  organization: 'company',
  title: 'role',
  position: 'role',
  job_title: 'role',
  type: 'category',
  business_type: 'category',
  industry: 'category',
  address: 'city',
  location: 'city',
  town: 'city',
  phone_number: 'phone',
  mobile: 'phone',
  tel: 'phone',
  telephone: 'phone',
  e_mail: 'email',
  email_address: 'email',
  mail: 'email',
  web: 'website',
  site: 'website',
  url: 'website',
  linkedin: 'linkedin_url',
  linkedin_profile: 'linkedin_url',
  linkedin_link: 'linkedin_url',
  maps: 'maps_url',
  maps_link: 'maps_url',
  google_maps: 'maps_url',
  google_maps_link: 'maps_url',
  where_met: 'met_where',
  upwork_job: 'upwork_job_title',
  upwork_link: 'upwork_job_url',
  budget: 'upwork_budget',
  connects: 'connects_spent',
  proposal: 'proposal_status',
  contact_via: 'channel',
  value: 'deal_value',
  deal: 'deal_value',
  follow_up: 'next_follow_up',
  next_followup: 'next_follow_up',
  tag: 'tags',
}

/** "LinkedIn URL" → "linkedin_url", "E-mail" → "e_mail". */
function headerKey(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const HEADER_MAP = new Map<string, CsvKey>([
  ...CSV_COLUMNS.map((c) => [c.key, c.key] as const),
  ...CSV_COLUMNS.map((c) => [headerKey(c.header), c.key] as const),
  ...Object.entries(HEADER_ALIASES),
])

/** Which contact field a CSV header means, or null if unknown. */
export function mapHeader(header: string): CsvKey | null {
  return HEADER_MAP.get(headerKey(header)) ?? null
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** Put this before the CSV text when saving, so Excel reads č/ć/š/ž correctly. */
export const CSV_BOM = '﻿'

/** Starts a spreadsheet formula. Such cells get a leading ' so Excel shows them as text. */
const FORMULA_START = /^[=+\-@\t\r]/

/** One CSV cell: quoted when needed, formula-looking text made safe with a leading '. */
export function escapeCell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value
  return /[",;\r\n]|^\s|\s$/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

function exportValue(contact: Pick<Contact, CsvKey>, key: CsvKey): string {
  const value = contact[key]
  if (value === null || value === undefined) return ''
  switch (key) {
    case 'source':
      return SOURCE_LABELS[contact.source]
    case 'stage':
      return STAGE_LABELS[contact.stage]
    case 'channel':
      return contact.channel ? CHANNEL_LABELS[contact.channel] : ''
    case 'tags':
      return contact.tags.join('; ')
    case 'won_month':
      return String(value).slice(0, 7)
    default:
      return String(value)
  }
}

/** Contacts as CSV text: header row + one row per contact, CRLF line ends (RFC 4180). */
export function contactsToCsv(contacts: readonly Pick<Contact, CsvKey>[]): string {
  const lines = [CSV_COLUMNS.map((c) => escapeCell(c.header)).join(',')]
  for (const contact of contacts) {
    lines.push(CSV_COLUMNS.map((c) => escapeCell(exportValue(contact, c.key))).join(','))
  }
  return lines.join('\r\n') + '\r\n'
}

// ---------------------------------------------------------------------------
// Reading CSV text
// ---------------------------------------------------------------------------

export type CsvRecord = { /** 1-based line the record starts on. */ line: number; cells: string[] }

/** Picks "," ";" or tab, whichever appears most in the header line (Excel in Europe saves with ";"). */
export function detectDelimiter(text: string): string {
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 }
  let inQuotes = false
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes
    else if (!inQuotes && (ch === '\n' || ch === '\r')) break
    else if (!inQuotes && ch in counts) counts[ch] = (counts[ch] ?? 0) + 1
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return best && best[1] > 0 ? best[0] : ','
}

/**
 * Splits CSV text into records. Handles quoted cells with commas, line breaks
 * and doubled quotes (""), CRLF/LF/CR line ends and a leading BOM.
 * `unclosedQuoteLine` is set when a quote is never closed.
 */
export function readCsv(
  text: string,
  delimiter: string = detectDelimiter(text),
): { records: CsvRecord[]; unclosedQuoteLine: number | null } {
  const src = text.startsWith(CSV_BOM) ? text.slice(1) : text
  const records: CsvRecord[] = []
  let cells: string[] = []
  let cell = ''
  let inQuotes = false
  let quoteLine = 0
  let line = 1
  let recordLine = 1

  const endCell = () => {
    cells.push(cell)
    cell = ''
  }
  const endRecord = () => {
    endCell()
    records.push({ line: recordLine, cells })
    cells = []
  }

  for (let i = 0; i < src.length; i++) {
    const ch = src[i] as string
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        if (ch === '\n' || (ch === '\r' && src[i + 1] !== '\n')) line++
        cell += ch
      }
      continue
    }
    if (ch === '"' && cell.trim() === '') {
      cell = ''
      inQuotes = true
      quoteLine = line
    } else if (ch === delimiter) {
      endCell()
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      endRecord()
      line++
      recordLine = line
    } else {
      cell += ch
    }
  }
  if (inQuotes) return { records, unclosedQuoteLine: quoteLine }
  if (cell !== '' || cells.length > 0) endRecord()
  return { records, unclosedQuoteLine: null }
}

// ---------------------------------------------------------------------------
// Import: one CSV row → a contact to insert
// ---------------------------------------------------------------------------

/** "Google Maps" / "google_maps" / "maps" → "googlemaps" / "maps": compare enum values loosely. */
const looseKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

function enumLookup<T extends string>(values: readonly T[], labels?: Record<T, string>, extra: Record<string, T> = {}) {
  const map = new Map<string, T>()
  for (const v of values) {
    map.set(looseKey(v), v)
    if (labels) map.set(looseKey(labels[v]), v)
  }
  for (const [k, v] of Object.entries(extra)) map.set(looseKey(k), v)
  return map
}

const SOURCE_LOOKUP = enumLookup(SOURCES, SOURCE_LABELS, { google: 'maps', person: 'inperson', offline: 'inperson' })
const STAGE_LOOKUP = enumLookup(STAGES, STAGE_LABELS)
const CHANNEL_LOOKUP = enumLookup(CHANNELS, CHANNEL_LABELS, { mail: 'email', call: 'phone', viber: 'phone' })
const PRIORITY_LOOKUP = enumLookup(PRIORITIES)
const PROPOSAL_LOOKUP = enumLookup(PROPOSAL_STATUSES)

const tooLong = (max: number) => `Keep it under ${max} characters`

/** Undo the ' we add in front of formula-like cells on export. */
const cleanCell = (value: string) => {
  const trimmed = value.trim()
  return /^'[=+\-@]/.test(trimmed) ? trimmed.slice(1) : trimmed
}

const cellText = (max: number) =>
  z
    .string()
    .transform(cleanCell)
    .pipe(z.string().max(max, tooLong(max)))
    .transform((v) => v || null)

function enumCell<T extends string>(lookup: Map<string, T>, message: string) {
  return z
    .string()
    .transform(cleanCell)
    .transform((value, ctx): T | null => {
      if (!value) return null
      const hit = lookup.get(looseKey(value))
      if (!hit) ctx.issues.push({ code: 'custom', message: `${message} (got "${value}")`, input: value })
      return hit ?? null
    })
}

const linkCell = z
  .string()
  .transform(cleanCell)
  .transform((value, ctx) => {
    if (!value) return null
    const url = toHttpUrl(value)
    if (!url || url.length > 2000) ctx.issues.push({ code: 'custom', message: 'Not a valid link', input: value })
    return url
  })

/**
 * Reads "1500", "1.500,50", "1,500.50", "€ 1 500" as a number.
 * The last "." or "," is the decimal point when 1–2 digits follow it.
 */
export function parseLooseNumber(raw: string): number {
  let s = raw.replace(/[€\s ]|eur/gi, '')
  if (!s) return Number.NaN
  const lastSep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
  if (lastSep >= 0 && /^\d{1,2}$/.test(s.slice(lastSep + 1))) {
    s = s.slice(0, lastSep).replace(/[.,]/g, '') + '.' + s.slice(lastSep + 1)
  } else {
    s = s.replace(/[.,]/g, '')
  }
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : Number.NaN
}

const numberCell = (max: number, { integer = false } = {}) =>
  z
    .string()
    .transform(cleanCell)
    .transform((value, ctx) => {
      if (!value) return null
      const n = parseLooseNumber(value)
      if (Number.isNaN(n)) ctx.issues.push({ code: 'custom', message: `Not a number ("${value}")`, input: value })
      else if (n < 0 || n > max) ctx.issues.push({ code: 'custom', message: `Must be 0–${max}`, input: value })
      else if (integer && !Number.isInteger(n))
        ctx.issues.push({ code: 'custom', message: 'Use a whole number', input: value })
      return n
    })

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-10-28", "28.10.2026", "28/10/2026" or "28 Oct 2026" → "2026-10-28"; null if not a real date. */
export function parseDateCell(raw: string): string | null {
  const s = raw.trim()
  let y: number, m: number, d: number
  let match: RegExpExecArray | null
  if ((match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) {
    ;[y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  } else if ((match = /^(\d{1,2})[./](\d{1,2})[./](\d{4})\.?$/.exec(s))) {
    ;[d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])]
  } else if ((match = /^(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s+(\d{4})$/i.exec(s))) {
    ;[d, m, y] = [Number(match[1]), MONTHS.indexOf((match[2] ?? '').toLowerCase()) + 1, Number(match[3])]
  } else {
    return null
  }
  const key = `${y}-${pad(m)}-${pad(d)}`
  return isDateKey(key) ? key : null
}

const dateCell = z
  .string()
  .transform(cleanCell)
  .transform((value, ctx) => {
    if (!value) return null
    const key = parseDateCell(value)
    if (!key) ctx.issues.push({ code: 'custom', message: `Not a date ("${value}"), use 2026-10-28`, input: value })
    return key
  })

/** "2026-10", "10/2026", "Oct 2026" or a full date → first day of that month ("2026-10-01"). */
const monthCell = z
  .string()
  .transform(cleanCell)
  .transform((value, ctx) => {
    if (!value) return null
    let match: RegExpExecArray | null
    let key: string | null = null
    if ((match = /^(\d{4})-(\d{1,2})$/.exec(value))) key = `${match[1]}-${pad(Number(match[2]))}-01`
    else if ((match = /^(\d{1,2})[./](\d{4})$/.exec(value))) key = `${match[2]}-${pad(Number(match[1]))}-01`
    else if ((match = /^([a-z]{3})[a-z]*\.?\s+(\d{4})$/i.exec(value)))
      key = `${match[2]}-${pad(MONTHS.indexOf((match[1] ?? '').toLowerCase()) + 1)}-01`
    else key = parseDateCell(value)?.slice(0, 8).concat('01') ?? null
    if (!key || !isDateKey(key)) {
      ctx.issues.push({ code: 'custom', message: `Not a month ("${value}"), use 2026-10`, input: value })
      return null
    }
    return key
  })

const tagsCell = z
  .string()
  .transform(cleanCell)
  .transform((value, ctx) => {
    const tags = [
      ...new Set(
        value
          .split(/[;,|]/)
          .map((t) => t.trim().replace(/^#/, '').replace(/\s+/g, '-').toLowerCase())
          .filter(Boolean),
      ),
    ]
    const bad = tags.find((t) => !tagSchema.safeParse(t).success)
    if (bad) ctx.issues.push({ code: 'custom', message: `Bad tag "${bad}"`, input: value })
    if (tags.length > 20) ctx.issues.push({ code: 'custom', message: 'Max 20 tags', input: value })
    return tags
  })

const emailCell = cellText(254).refine((v) => v === null || z.email().safeParse(v).success, 'Not a valid email')

/** One CSV row (all cells as strings, missing columns as "") → a contact to insert. */
export const contactImportSchema = z.object({
  name: cellText(120).refine((v) => v !== null, 'Name is empty'),
  source: enumCell(SOURCE_LOOKUP, 'Unknown source').transform((v) => v ?? 'other'),
  stage: enumCell(STAGE_LOOKUP, 'Unknown stage').transform((v) => v ?? 'new'),
  company: cellText(120),
  role: cellText(120),
  category: cellText(80),
  city: cellText(120),
  phone: cellText(40),
  email: emailCell,
  website: linkCell,
  linkedin_url: linkCell,
  maps_url: linkCell,
  met_where: cellText(200),
  upwork_job_title: cellText(200),
  upwork_job_url: linkCell,
  upwork_budget: numberCell(10_000_000),
  connects_spent: numberCell(1000, { integer: true }),
  proposal_status: enumCell(PROPOSAL_LOOKUP, 'Unknown proposal status'),
  channel: enumCell(CHANNEL_LOOKUP, 'Unknown channel'),
  priority: enumCell(PRIORITY_LOOKUP, 'Priority is low, medium or high').transform((v) => v ?? 'medium'),
  deal_value: numberCell(10_000_000),
  won_amount: numberCell(10_000_000),
  won_month: monthCell,
  next_follow_up: dateCell,
  lost_reason: cellText(500),
  tags: tagsCell,
})
export type ContactImport = z.output<typeof contactImportSchema> & { name: string }

export type CsvLineError = { /** 1-based line in the file (header is line 1). */ line: number; messages: string[] }

export type ParsedContactsCsv = {
  /** Valid rows, ready to insert, with the line they came from. */
  rows: { line: number; contact: ContactImport }[]
  /** Rows that were skipped and why. Line 1 errors mean the whole file is unusable. */
  errors: CsvLineError[]
  /** Headers we didn't recognise (their columns are ignored). */
  ignoredColumns: string[]
}

export const MAX_IMPORT_ROWS = 5000

const HEADER_OF = Object.fromEntries(CSV_COLUMNS.map((c) => [c.key, c.header])) as Record<CsvKey, string>

/**
 * Reads a contacts CSV (ours or a hand-made one). Headers are matched loosely
 * ("E-mail", "Business name", "LinkedIn"…), "," or ";" separators both work,
 * empty lines are skipped. Each bad row is reported with its line number;
 * good rows are still returned.
 */
export function parseContactsCsv(text: string): ParsedContactsCsv {
  const { records, unclosedQuoteLine } = readCsv(text)
  const result: ParsedContactsCsv = { rows: [], errors: [], ignoredColumns: [] }

  if (unclosedQuoteLine !== null) {
    result.errors.push({ line: unclosedQuoteLine, messages: ['A quote (") is opened here but never closed'] })
    return result
  }

  const header = records[0]
  if (!header || header.cells.every((c) => !c.trim())) {
    result.errors.push({ line: 1, messages: ['The file is empty'] })
    return result
  }

  // Column index → field. The first column with a given meaning wins.
  const columns = new Map<number, CsvKey>()
  const seen = new Set<CsvKey>()
  header.cells.forEach((raw, index) => {
    const key = mapHeader(raw)
    if (key && !seen.has(key)) {
      columns.set(index, key)
      seen.add(key)
    } else if (raw.trim()) {
      result.ignoredColumns.push(raw.trim())
    }
  })
  if (!seen.has('name')) {
    result.errors.push({ line: header.line, messages: ['No "Name" column found'] })
    return result
  }

  const columnOf = new Map([...columns].map(([index, key]) => [key, index]))

  const body = records.slice(1).filter((r) => r.cells.some((c) => c.trim()))
  if (body.length > MAX_IMPORT_ROWS) {
    result.errors.push({ line: 1, messages: [`Too many rows (${body.length}); max is ${MAX_IMPORT_ROWS}`] })
    return result
  }

  for (const record of body) {
    const input = Object.fromEntries(CSV_COLUMNS.map((c) => [c.key, ''])) as Record<CsvKey, string>
    columns.forEach((key, index) => {
      input[key] = record.cells[index] ?? ''
    })
    const parsed = contactImportSchema.safeParse(input)
    if (parsed.success) {
      result.rows.push({ line: record.line, contact: parsed.data as ContactImport })
    } else {
      // Same order as the columns in the file, left to right.
      const messages = parsed.error.issues
        .map((issue) => ({ issue, key: issue.path[0] as CsvKey | undefined }))
        .sort((a, b) => (a.key ? columnOf.get(a.key) ?? 0 : -1) - (b.key ? columnOf.get(b.key) ?? 0 : -1))
        .map(({ issue, key }) => (key ? `${HEADER_OF[key]}: ${issue.message}` : issue.message))
      result.errors.push({ line: record.line, messages })
    }
  }
  return result
}
