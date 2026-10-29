import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** False until .env.local has the Supabase URL and publishable (anon) key. */
export const isSupabaseConfigured = Boolean(url && publishableKey)

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    'Supabase is not configured. Copy .env.example to .env.local and add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
  )
}

// Placeholders keep the app (and the login page) loading before keys exist;
// every request simply fails until real values are set.
export const supabase = createClient<Database>(
  url ?? 'http://localhost:54321',
  publishableKey ?? 'missing-publishable-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Password sign-in only: never accept a login token from a link in the URL.
      detectSessionInUrl: false,
    },
  },
)
