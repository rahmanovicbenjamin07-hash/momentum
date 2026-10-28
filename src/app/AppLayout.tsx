import { useNavigate, Outlet } from 'react-router'
import { toast } from 'sonner'
import { useProfile } from '@/api/profile'
import { AppShell } from '@/components/layout/AppShell'
import { supabase } from '@/lib/supabase'
import { useAuth } from './auth-context'
import { useTodayData } from './useTodayData'

export default function AppLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: profile } = useProfile(user?.id)
  // Sidebar: open items today (badge) and the current streak. Shares the cache with the Today page.
  const { view: todayView } = useTodayData()

  async function signOut() {
    // 'local' signs out this browser only, so your phone stays signed in.
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) {
      toast.error("Couldn't sign out. Try again.")
      return
    }
    navigate('/login', { replace: true })
  }

  return (
    <AppShell
      topBar={{
        user: { name: profile?.display_name ?? null, email: user?.email ?? '' },
        onSearch: () => toast('Search is coming in a later phase.'),
        onNew: () => toast('Quick add is coming in a later phase.'),
        onNotifications: () => toast('No notifications yet.'),
        onSignOut: () => void signOut(),
      }}
      sidebar={{ todayCount: todayView?.openToday, streakDays: todayView?.streak.days }}
    >
      <Outlet />
    </AppShell>
  )
}
