// Restore one of the signed-in user's backups (JWT required).
// Body: { path: "<user id>/<file>.json" }.
// 1. Saves the current data as backups/<user id>/before-restore-<timestamp>.json.
// 2. Replaces the user's data with the backup's rows in one database transaction
//    (public.restore_user_data, run as the user so RLS applies).
// Returns { restoredTables, rows }.
import { adminClient, corsHeaders, exportUser, getCaller, json, uploadJson, BUCKET } from '../_shared/common.ts'

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)

  const caller = await getCaller(req)
  if (!caller) return json({ error: 'Not signed in' }, 401)
  const { userId, client } = caller

  let path: unknown
  try {
    path = ((await req.json()) as { path?: unknown }).path
  } catch {
    return json({ error: 'Body must be JSON: { path }' }, 400)
  }
  if (typeof path !== 'string' || !path.startsWith(`${userId}/`) || path.includes('..') || !path.endsWith('.json')) {
    return json({ error: 'You can only restore your own backups' }, 403)
  }

  // Download as the user: the Storage policy only lets them read their own folder.
  const { data: blob, error: downloadError } = await client.storage.from(BUCKET).download(path)
  if (downloadError || !blob) return json({ error: 'Backup not found' }, 404)

  let backup: unknown
  try {
    backup = JSON.parse(await blob.text())
  } catch {
    return json({ error: 'The backup file is not valid JSON' }, 400)
  }
  if (!isObject(backup) || backup.app !== 'momentum' || backup.version !== 1 || !isObject(backup.tables)) {
    return json({ error: 'This is not a Momentum backup' }, 400)
  }

  try {
    // Safety copy first. Uploading needs the service role (users can only read the bucket).
    const { file, rows: savedRows } = await exportUser(client, userId)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const safetyPath = `${userId}/before-restore-${stamp}.json`
    await uploadJson(adminClient(), safetyPath, file)
    console.log(`restore: user ${userId}: saved ${savedRows} current rows to ${safetyPath}`)

    const { data, error } = await client.rpc('restore_user_data', { p_tables: backup.tables })
    if (error) throw new Error(error.message)
    const result = data as { restoredTables: number; rows: number }
    console.log(`restore: user ${userId}: ${result.rows} rows in ${result.restoredTables} tables from ${path}`)
    return json(result)
  } catch (e) {
    console.error(`restore: user ${userId} failed:`, e instanceof Error ? e.message : String(e))
    return json({ error: 'Restore failed. Your data was not changed.' }, 500)
  }
})
