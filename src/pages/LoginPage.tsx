import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@/app/auth-context'
import { LoginCard } from '@/components/auth/LoginCard'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

const googleEnabled = import.meta.env.VITE_ENABLE_GOOGLE_LOGIN === 'true'

function friendlyAuthError(message: string): string {
  if (/rate limit|too many/i.test(message)) {
    return 'Too many sign-in emails were sent. Wait a few minutes and try again.'
  }
  if (/fetch|network/i.test(message)) {
    return "Can't reach the server. Check your connection and try again."
  }
  return message
}

export default function LoginPage() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (loading) return <FullPageSpinner />
  if (session) return <Navigate to={from} replace />

  async function sendLink(email: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured yet.')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw new Error(friendlyAuthError(error.message))
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw new Error(friendlyAuthError(error.message))
  }

  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-10">
      <LoginCard
        onSendLink={sendLink}
        onGoogle={googleEnabled ? signInWithGoogle : undefined}
        notConfigured={!isSupabaseConfigured}
      />
    </main>
  )
}
