import type { SidebarProps } from '@/components/layout/Sidebar'
import type { ShellUser } from '@/components/layout/UserMenu'

export const mockUser: ShellUser = {
  name: 'Benjamin Rahmanović',
  email: 'benjamin@example.com',
}

export const mockSidebar: SidebarProps = {
  todayCount: 6,
  outreachDue: 4,
  streakDays: 12,
}

export const mockUnreadCount = 2
