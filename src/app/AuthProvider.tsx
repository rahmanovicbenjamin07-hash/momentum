import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { isSessionTooOld } from '@/lib/authSession'
import { supabase } from '@/lib/supabase'
import { AuthContext, type AuthState } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    // A sign-in lasts 30 days; after that the password must be entered again.
    // Also runs on every hourly token refresh, so an open tab is covered too.
    function keepIfFresh(next: Session | null): Session | null {
      if (next && isSessionTooOld(next.user.last_sign_in_at)) {
        void supabase.auth.signOut({ scope: 'local' })
        return null
      }
      return next
    }

    // Reads the session saved in this browser.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(keepIfFresh(data.session))
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      setSession(keepIfFresh(nextSession))
      setLoading(false)
      // Never show one person's cached data to the next.
      if (event === 'SIGNED_OUT') queryClient.clear()
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [queryClient])

  const value = useMemo<AuthState>(
    () => ({ session, user: session?.user ?? null, loading }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
