import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@/app/auth-context'
import { LoginCard } from '@/components/auth/LoginCard'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.'
  if (/email not confirmed/i.test(message)) return 'This email is not confirmed yet. Open the confirmation email first.'
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Wait a few minutes and try again.'
  if (/fetch|network/i.test(message)) return "Can't reach the server. Check your connection and try again."
  return message
}

export default function LoginPage() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (loading) return <FullPageSpinner />
  if (session) return <Navigate to={from} replace />

  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured yet.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(friendlyAuthError(error.message))
  }

  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-10">
      <LoginCard onSignIn={signIn} notConfigured={!isSupabaseConfigured} />
    </main>
  )
}
