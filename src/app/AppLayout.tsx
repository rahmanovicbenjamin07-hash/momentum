import { Outlet } from 'react-router'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'

// Temporary user until login is wired up (step 6).
const placeholderUser = { name: null, email: 'you@example.com' }

export default function AppLayout() {
  return (
    <AppShell
      topBar={{
        user: placeholderUser,
        onSearch: () => toast('Search is coming in a later phase.'),
        onNew: () => toast('Quick add is coming in a later phase.'),
        onNotifications: () => toast('No notifications yet.'),
        onSignOut: () => toast('Sign out arrives with login.'),
      }}
      sidebar={{}}
    >
      <Outlet />
    </AppShell>
  )
}
