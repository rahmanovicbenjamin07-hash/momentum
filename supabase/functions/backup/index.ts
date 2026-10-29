// Nightly backup (called by the 'momentum-backup' Cron job; deployed with --no-verify-jwt).
// For every user with backups on: save all their data as backups/<user id>/<YYYY-MM-DD>.json
// and delete their backup files older than 30 days.
// Only accepts calls with the right x-cron-secret header. Logs counts, never row contents.
import { adminClient, exportUser, json, listUserFiles, safeEqual, sarajevoDate, uploadJson, BUCKET } from '../_shared/common.ts'

const KEEP_DAYS = 30

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET') ?? ''
  if (!secret || !safeEqual(req.headers.get('x-cron-secret') ?? '', secret)) {
    return json({ error: 'Forbidden' }, 403)
  }

  const admin = adminClient()
  const { data: profiles, error } = await admin.from('profiles').select('user_id').eq('backup_enabled', true)
  if (error) {
    console.error('backup: could not read profiles:', error.message)
    return json({ error: 'Could not read profiles' }, 500)
  }

  const now = new Date()
  const day = sarajevoDate(now)
  const cutoff = now.getTime() - KEEP_DAYS * 24 * 60 * 60 * 1000
  const results: { userId: string; ok: boolean; rows?: number; deleted?: number; path?: string }[] = []

  for (const { user_id: userId } of profiles) {
    try {
      const { file, rows } = await exportUser(admin, userId)
      const path = `${userId}/${day}.json`
      await uploadJson(admin, path, file)

      const old = (await listUserFiles(admin, userId))
        .filter((f) => f.created_at && new Date(f.created_at).getTime() < cutoff)
        .map((f) => `${userId}/${f.name}`)
      if (old.length) {
        const { error: removeError } = await admin.storage.from(BUCKET).remove(old)
        if (removeError) throw new Error(`remove old files: ${removeError.message}`)
      }

      console.log(`backup: user ${userId}: ${rows} rows saved to ${path}, ${old.length} old files deleted`)
      results.push({ userId, ok: true, rows, deleted: old.length, path })
    } catch (e) {
      console.error(`backup: user ${userId} failed:`, e instanceof Error ? e.message : String(e))
      results.push({ userId, ok: false })
    }
  }

  console.log(`backup: done, ${results.filter((r) => r.ok).length}/${results.length} users`)
  return json({ users: results.length, ok: results.filter((r) => r.ok).length, results })
})
