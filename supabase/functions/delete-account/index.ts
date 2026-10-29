// Delete the signed-in user's account (JWT required).
// Removes every file in backups/<user id>/, then deletes the auth user;
// "on delete cascade" removes all their rows. Returns 204.
import { adminClient, corsHeaders, getCaller, json, listUserFiles, BUCKET } from '../_shared/common.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)

  const caller = await getCaller(req)
  if (!caller) return json({ error: 'Not signed in' }, 401)
  const { userId } = caller
  const admin = adminClient()

  try {
    const files = (await listUserFiles(admin, userId)).map((f) => `${userId}/${f.name}`)
    for (let i = 0; i < files.length; i += 100) {
      const { error } = await admin.storage.from(BUCKET).remove(files.slice(i, i + 100))
      if (error) throw new Error(`remove backups: ${error.message}`)
    }

    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) throw new Error(`delete user: ${error.message}`)

    console.log(`delete-account: user ${userId} deleted, ${files.length} backup files removed`)
    return new Response(null, { status: 204, headers: corsHeaders })
  } catch (e) {
    console.error(`delete-account: user ${userId} failed:`, e instanceof Error ? e.message : String(e))
    return json({ error: 'Could not delete the account. Try again.' }, 500)
  }
})
