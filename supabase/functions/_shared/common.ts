// Shared by the backup, restore and delete-account Edge Functions (Deno).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0'

/**
 * Same list and order as EXPORT_TABLES in src/lib/exportData.ts (Edge Functions
 * can't import app code). Keep the two in sync.
 */
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

/** Same shape as buildJsonExport in src/lib/exportData.ts. */
export type JsonExport = {
  app: 'momentum'
  version: 1
  exported_at: string
  tables: Partial<Record<ExportTable, Row[]>>
}

export function buildJsonExport(tables: Partial<Record<ExportTable, Row[]>>, exportedAt: string): JsonExport {
  return { app: 'momentum', version: 1, exported_at: exportedAt, tables }
}

export const BUCKET = 'backups'
const PAGE = 1000

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function env(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing env var ${name}`)
  return value
}

/** Full access, ignores RLS. Only for work no signed-in user can do (Storage writes, deleting a user). */
export function adminClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * The caller, from the Authorization header. Returns their id and a client that
 * acts as them (RLS applies), or null if the token is missing or invalid.
 */
export async function getCaller(req: Request): Promise<{ userId: string; client: SupabaseClient } | null> {
  const header = req.headers.get('Authorization') ?? ''
  const token = header.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return null
  return { userId: data.user.id, client }
}

/** Every row of one table for one user (pages past the 1000-row API limit). */
export async function readUserTable(client: SupabaseClient, table: ExportTable, userId: string): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data as Row[]))
    if (data.length < PAGE) return rows
  }
}

/** A full export of one user's data. */
export async function exportUser(client: SupabaseClient, userId: string): Promise<{ file: JsonExport; rows: number }> {
  const tables: Partial<Record<ExportTable, Row[]>> = {}
  let rows = 0
  for (const table of EXPORT_TABLES) {
    tables[table] = await readUserTable(client, table, userId)
    rows += tables[table].length
  }
  return { file: buildJsonExport(tables, new Date().toISOString()), rows }
}

/** Uploads (or overwrites) a JSON file in the backups bucket. */
export async function uploadJson(admin: SupabaseClient, path: string, file: JsonExport): Promise<void> {
  const body = new Blob([JSON.stringify(file)], { type: 'application/json' })
  const { error } = await admin.storage.from(BUCKET).upload(path, body, { upsert: true, contentType: 'application/json' })
  if (error) throw new Error(`upload ${path}: ${error.message}`)
}

/** Every file in a user's folder (name + created_at). */
export async function listUserFiles(
  admin: SupabaseClient,
  userId: string,
): Promise<{ name: string; created_at: string | null }[]> {
  const files: { name: string; created_at: string | null }[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage.from(BUCKET).list(userId, { limit: PAGE, offset })
    if (error) throw new Error(`list ${userId}: ${error.message}`)
    files.push(...data.filter((f) => f.id !== null).map((f) => ({ name: f.name, created_at: f.created_at })))
    if (data.length < PAGE) return files
  }
}

/** Constant-time string compare (for the cron secret). */
export function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a)
  const y = new TextEncoder().encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

/** "YYYY-MM-DD" in Europe/Sarajevo. */
export function sarajevoDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sarajevo' }).format(date)
}
