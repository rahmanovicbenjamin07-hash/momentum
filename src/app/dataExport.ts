/**
 * Settings → Data: fetch the user's rows and download them as JSON or CSV,
 * and insert metric values read from a CSV file.
 */
import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/keys'
import { CSV_BOM, contactsToCsv } from '@/lib/csv'
import type { DateKey } from '@/lib/dates'
import {
  buildJsonExport,
  EXPORT_TABLES,
  exportFileName,
  tableToCsv,
  type ExportTable,
  type MetricValueRow,
  type Row,
} from '@/lib/exportData'
import { supabase } from '@/lib/supabase'
import type { Contact } from '@/schemas/outreach'

/** The API returns at most 1000 rows per call, so read in pages. */
const PAGE = 1000

/** Every row of one table the user can see (RLS: only their own). */
export async function fetchAllRows(table: ExportTable): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at')
      .range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data as Row[]))
    if (data.length < PAGE) return rows
  }
}

/** Saves text as a file through a temporary link. */
export function downloadText(text: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** "Export everything (JSON)": all 16 tables in one file. Resolves with the number of rows. */
export async function exportEverything(today: DateKey): Promise<number> {
  const tables = await Promise.all(EXPORT_TABLES.map(async (t) => [t, await fetchAllRows(t)] as const))
  const data = Object.fromEntries(tables) as Record<ExportTable, Row[]>
  downloadText(JSON.stringify(buildJsonExport(data, new Date().toISOString()), null, 2), exportFileName('json', today), 'application/json')
  return tables.reduce((n, [, rows]) => n + rows.length, 0)
}

export type CsvExportKind = 'tasks' | 'contacts' | 'metric_values'

/**
 * "Export CSV": tasks as stored; contacts and metric values in the same columns
 * Import CSV reads, so the files can go straight back in. Resolves with the row count.
 */
export async function exportCsv(kind: CsvExportKind, today: DateKey): Promise<number> {
  let csv: string
  let count: number
  let name: string
  if (kind === 'tasks') {
    const rows = await fetchAllRows('tasks')
    csv = tableToCsv('tasks', rows)
    count = rows.length
    name = exportFileName('tasks', today)
  } else if (kind === 'contacts') {
    const rows = (await fetchAllRows('contacts')) as unknown as Contact[]
    csv = contactsToCsv(rows)
    count = rows.length
    name = exportFileName('contacts', today)
  } else {
    const [metrics, entries] = await Promise.all([fetchAllRows('metrics'), fetchAllRows('metric_entries')])
    const names = new Map(metrics.map((m) => [m.id, String(m.name)]))
    const rows = entries.map((e) => ({
      metric: names.get(String(e.metric_id)) ?? '',
      month: e.entry_date,
      value: e.value,
      note: e.note,
    }))
    csv = rows.length ? tableToCsv('metric_entries', rows) : 'metric,month,value,note\r\n'
    count = rows.length
    name = exportFileName('metric_entries', today)
  }
  downloadText(CSV_BOM + csv, name, 'text/csv;charset=utf-8')
  return count
}

/** Adds the imported metric values as new entries, then refreshes the Stats and Goals pages. */
export async function insertMetricValues(rows: readonly MetricValueRow[], queryClient: QueryClient): Promise<void> {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('metric_entries').insert(rows.slice(i, i + 500).map((r) => ({ ...r })))
    if (error) throw error
  }
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.stats.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.goals.all }),
  ])
}
