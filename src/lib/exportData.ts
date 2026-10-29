/**
 * Settings → Data: export everything as JSON (or one table as CSV), check a JSON
 * backup before restoring it, and read metric values from a CSV file.
 */
import type { ZodType } from 'zod'
import { goalSchema } from '@/schemas/goals'
import { experimentSchema, ideaSchema, lessonSchema, reviewSchema } from '@/schemas/improve'
import { contactSchema, stageHistorySchema, templateSchema, touchSchema } from '@/schemas/outreach'
import { notificationPrefSchema } from '@/schemas/settings'
import { metricEntrySchema, metricSchema } from '@/schemas/stats'
import { dailyLogSchema, routineCheckSchema, routineItemSchema, taskSchema } from '@/schemas/today'
import { escapeCell, parseLooseNumber, readCsv, type CsvLineError } from './csv'
import { isDateKey, type DateKey } from './dates'

/** Every table in an export. Parents come before children, so this is also the insert order for a restore. */
export const EXPORT_TABLES = [
  'routine_items',
  'routine_checks',
  'tasks',
  'daily_logs',
  'contacts',
  'touches',
  'stage_history',
  'templates',
  'metrics',
  'metric_entries',
  'goals',
  'reviews',
  'lessons',
  'experiments',
  'ideas',
  'notification_prefs',
] as const
export type ExportTable = (typeof EXPORT_TABLES)[number]

export type Row = Record<string, unknown>
export type ExportTables = Record<ExportTable, Row[]>

/** The Zod schema each table's rows must pass. */
const ROW_SCHEMAS: Record<ExportTable, ZodType> = {
  routine_items: routineItemSchema,
  routine_checks: routineCheckSchema,
  tasks: taskSchema,
  daily_logs: dailyLogSchema,
  contacts: contactSchema,
  touches: touchSchema,
  stage_history: stageHistorySchema,
  templates: templateSchema,
  metrics: metricSchema,
  metric_entries: metricEntrySchema,
  goals: goalSchema,
  reviews: reviewSchema,
  lessons: lessonSchema,
  experiments: experimentSchema,
  ideas: ideaSchema,
  notification_prefs: notificationPrefSchema,
}

export const EXPORT_APP = 'momentum'
export const EXPORT_VERSION = 1

export type JsonExport = {
  app: typeof EXPORT_APP
  version: typeof EXPORT_VERSION
  /** ISO timestamp. */
  exported_at: string
  tables: Partial<Record<ExportTable, Row[]>>
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function buildJsonExport(data: Partial<Record<ExportTable, Row[]>>, exportedAt: string): JsonExport {
  return { app: EXPORT_APP, version: EXPORT_VERSION, exported_at: exportedAt, tables: data }
}

/** "momentum-export-2026-10-29.json" or "momentum-tasks-2026-10-29.csv". */
export function exportFileName(kind: 'json' | ExportTable, date: DateKey): string {
  return kind === 'json' ? `momentum-export-${date}.json` : `momentum-${kind.replace(/_/g, '-')}-${date}.csv`
}

function csvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * One table as CSV: a header row with every column (in the order they first
 * appear), then one row per record. Arrays and jsonb are written as JSON text.
 * CRLF line ends (RFC 4180), like contactsToCsv.
 */
export function tableToCsv(_table: ExportTable, rows: readonly Row[]): string {
  const columns: string[] = []
  for (const row of rows) {
    for (const key of Object.keys(row)) if (!columns.includes(key)) columns.push(key)
  }
  const lines = [columns.map(escapeCell).join(',')]
  for (const row of rows) lines.push(columns.map((c) => escapeCell(csvValue(row[c]))).join(','))
  return lines.join('\r\n') + '\r\n'
}

// ---------------------------------------------------------------------------
// Restore: check a JSON backup
// ---------------------------------------------------------------------------

/** Stop listing problems after this many (a broken file could have thousands). */
export const MAX_EXPORT_ERRORS = 50

export type ValidatedExport =
  | { ok: true; data: ExportTables; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] }

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Checks a parsed JSON backup: app and version, and every row against its
 * table's schema ("tasks row 3: title: …"). Missing tables become empty;
 * unknown tables are left out with a warning. The rows are returned as they
 * were in the file (columns the schema doesn't list are kept for the restore).
 */
export function validateExport(json: unknown): ValidatedExport {
  const warnings: string[] = []
  if (!isObject(json)) return { ok: false, errors: ['This isn’t a Momentum export file.'], warnings }
  if (json.app !== EXPORT_APP) return { ok: false, errors: ['This isn’t a Momentum export file.'], warnings }
  if (json.version !== EXPORT_VERSION) {
    return { ok: false, errors: [`Unsupported export version: ${String(json.version)} (expected ${EXPORT_VERSION}).`], warnings }
  }
  if (!isObject(json.tables)) return { ok: false, errors: ['The file has no tables.'], warnings }

  const errors: string[] = []
  const data = Object.fromEntries(EXPORT_TABLES.map((t) => [t, [] as Row[]])) as ExportTables
  const known = new Set<string>(EXPORT_TABLES)

  for (const [table, rows] of Object.entries(json.tables)) {
    if (!known.has(table)) {
      warnings.push(`Unknown table "${table}" was ignored.`)
      continue
    }
    if (!Array.isArray(rows)) {
      errors.push(`${table}: expected a list of rows.`)
      continue
    }
    const schema = ROW_SCHEMAS[table as ExportTable]
    rows.forEach((row, i) => {
      const result = schema.safeParse(row)
      if (!result.success && errors.length < MAX_EXPORT_ERRORS) {
        const issue = result.error.issues[0]
        const where = issue?.path.length ? `${issue.path.join('.')}: ` : ''
        errors.push(`${table} row ${i + 1}: ${where}${issue?.message ?? 'invalid row'}`)
      }
    })
    data[table as ExportTable] = rows as Row[]
  }

  return errors.length ? { ok: false, errors, warnings } : { ok: true, data, warnings }
}

// ---------------------------------------------------------------------------
// Import metric values from CSV
// ---------------------------------------------------------------------------

export type MetricValueRow = { metric_id: string; entry_date: DateKey; value: number; note: string | null }

export type ParsedMetricValues = { rows: MetricValueRow[]; errors: CsvLineError[] }

const HEADERS = { metric: ['metric', 'name'], month: ['month', 'date'], value: ['value', 'amount'], note: ['note', 'notes'] } as const
const NOTE_MAX = 500

/**
 * Reads "metric, month, value, note" rows (any order, header names case-insensitive).
 * metric = a metric's name (case-insensitive); month = "YYYY-MM" (stored as the 1st) or
 * "YYYY-MM-DD"; value = a number ≥ 0 ("1.500,50" works); note is optional.
 */
export function parseMetricValuesCsv(text: string, metrics: readonly { id: string; name: string }[]): ParsedMetricValues {
  const { records, unclosedQuoteLine } = readCsv(text)
  if (unclosedQuoteLine !== null) {
    return { rows: [], errors: [{ line: unclosedQuoteLine, messages: ['A quote (") is never closed.'] }] }
  }
  const [header, ...body] = records
  if (!header) return { rows: [], errors: [{ line: 1, messages: ['The file is empty.'] }] }

  const names = header.cells.map((c) => c.trim().toLowerCase())
  const col = (key: keyof typeof HEADERS) => names.findIndex((n) => (HEADERS[key] as readonly string[]).includes(n))
  const index = { metric: col('metric'), month: col('month'), value: col('value'), note: col('note') }
  const missing = (['metric', 'month', 'value'] as const).filter((k) => index[k] < 0)
  if (missing.length) return { rows: [], errors: [{ line: header.line, messages: [`Missing column: ${missing.join(', ')}`] }] }

  const byName = new Map(metrics.map((m) => [m.name.trim().toLowerCase(), m.id]))
  const rows: MetricValueRow[] = []
  const errors: CsvLineError[] = []

  for (const record of body) {
    const cell = (i: number) => (i >= 0 ? (record.cells[i] ?? '').trim() : '')
    if (record.cells.every((c) => c.trim() === '')) continue
    const messages: string[] = []

    const metricName = cell(index.metric)
    const metricId = byName.get(metricName.toLowerCase())
    if (!metricName) messages.push('Metric is empty')
    else if (!metricId) messages.push(`Unknown metric "${metricName}"`)

    const month = cell(index.month)
    const entryDate = /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : month
    if (!isDateKey(entryDate)) messages.push(`"${month}" isn’t a month (use YYYY-MM or YYYY-MM-DD)`)

    const value = parseLooseNumber(cell(index.value))
    if (Number.isNaN(value)) messages.push(`"${cell(index.value)}" isn’t a number`)
    else if (value < 0) messages.push('Value can’t be negative')

    const note = cell(index.note)
    if (note.length > NOTE_MAX) messages.push(`Note is longer than ${NOTE_MAX} characters`)

    if (messages.length || !metricId) errors.push({ line: record.line, messages })
    else rows.push({ metric_id: metricId, entry_date: entryDate, value, note: note || null })
  }
  return { rows, errors }
}
