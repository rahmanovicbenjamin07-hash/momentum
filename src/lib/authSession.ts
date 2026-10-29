/** How long a sign-in lasts before you must enter your password again. */
export const SESSION_MAX_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * True when the last password sign-in was more than SESSION_MAX_DAYS ago.
 * `lastSignInAt` is Supabase's `user.last_sign_in_at` (ISO text). Token refreshes
 * don't change it, so it marks the moment you last typed your password.
 * Missing or unreadable dates are treated as expired, to be safe.
 */
export function isSessionTooOld(lastSignInAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!lastSignInAt) return true
  const signedIn = Date.parse(lastSignInAt)
  if (Number.isNaN(signedIn)) return true
  return now.getTime() - signedIn > SESSION_MAX_DAYS * DAY_MS
}
