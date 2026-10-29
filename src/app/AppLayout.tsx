import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate, Outlet } from 'react-router'
import { toast } from 'sonner'
import { queryKeys } from '@/api/keys'
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from '@/api/notifications'
import { useProfile } from '@/api/profile'
import { AppShell } from '@/components/layout/AppShell'
import { supabase } from '@/lib/supabase'
import { useAuth } from './auth-context'
import { toNotificationItems } from './notificationsView'
import { setTheme } from './theme'
import { useFollowUpsDue } from './useOutreachWeek'
import { useTodayData } from './useTodayData'
import { useUserToday } from './useUserToday'

export default function AppLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: profile } = useProfile(user?.id)
  // Sidebar: open items today (badge) and the current streak. Shares the cache with the Today page.
  const { view: todayView, today } = useTodayData()
  const outreachDue = useFollowUpsDue(today)
  const { timeZone } = useUserToday()

  // The bell: unread dot, panel with the newest notifications.
  const queryClient = useQueryClient()
  const [panelOpen, setPanelOpen] = useState(false)
  // "09:00" / "Yesterday" labels are worked out from when the panel was opened.
  const [openedAt, setOpenedAt] = useState(() => new Date())
  const unread = useUnreadCount()
  const notifications = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  // Back on the tab: check for new notifications straight away instead of waiting for the next poll.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [queryClient])

  // The profile's theme wins once it loads (it may have been changed on another device).
  const profileTheme = profile?.theme
  useEffect(() => {
    if (profileTheme === 'light' || profileTheme === 'dark' || profileTheme === 'system') setTheme(profileTheme)
  }, [profileTheme])

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
        unreadCount: unread.data ?? 0,
        onNotifications: () => {
          setOpenedAt(new Date())
          setPanelOpen((open) => !open)
        },
        notificationsPanel: panelOpen
          ? {
              items: toNotificationItems(notifications.data ?? [], openedAt, timeZone),
              onMarkAllRead: () => markAllRead.mutate(),
              onOpen: (item) => {
                if (item.read_at === null) markRead.mutate(item.id)
                setPanelOpen(false)
                // Only links inside the app; anything else just closes the panel.
                if (item.link?.startsWith('/')) navigate(item.link)
              },
              onClose: () => setPanelOpen(false),
            }
          : undefined,
        onSignOut: () => void signOut(),
      }}
      sidebar={{ todayCount: todayView?.openToday, outreachDue, streakDays: todayView?.streak.days }}
    >
      <Outlet />
    </AppShell>
  )
}
