import {
  CalendarCheck,
  ChartNoAxesColumn,
  Send,
  SlidersHorizontal,
  Target,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { StreakMini } from '@/components/streak/StreakMini'
import { cn } from '@/lib/utils'

export type SidebarProps = {
  /** Number of open tasks today. Hidden when undefined or 0. */
  todayCount?: number
  /** Number of outreach follow-ups due. Hidden when undefined or 0. */
  outreachDue?: number
  /** Current streak in days. Card hidden when undefined. */
  streakDays?: number
}

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const workspaceItems: NavItem[] = [
  { to: '/', label: 'Today', icon: CalendarCheck, end: true },
  { to: '/outreach', label: 'Outreach', icon: Send },
  { to: '/stats', label: 'Stats', icon: ChartNoAxesColumn },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/improve', label: 'Improvements', icon: TrendingUp },
]

const settingsItem: NavItem = { to: '/settings', label: 'Settings', icon: SlidersHorizontal }

function SidebarLink({ item, badge, label }: { item: NavItem; badge?: ReactNode; label?: string }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      aria-label={label}
      className={({ isActive }) =>
        cn(
          'flex h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-medium whitespace-nowrap outline-none',
          'focus-visible:ring-3 focus-visible:ring-ring/50',
          isActive ? 'bg-brand-tint text-brand' : 'text-ink-2 hover:bg-muted hover:text-foreground',
        )
      }
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span className="md:flex-1">{item.label}</span>
      {badge}
    </NavLink>
  )
}

export function Sidebar({ todayCount, outreachDue, streakDays }: SidebarProps) {
  return (
    <aside className="border-b border-border bg-card md:w-[220px] md:shrink-0 md:border-r md:border-b-0">
      <nav aria-label="Main" className="md:sticky md:top-0 md:px-3 md:py-6">
        <p className="hidden px-3 pb-2 text-[11px] font-semibold tracking-wider text-ink-3 uppercase md:block">
          Workspace
        </p>

        <ul className="flex flex-wrap gap-1 px-3 py-2 md:flex-col md:flex-nowrap md:p-0">
          {workspaceItems.map((item) => (
            <li key={item.to}>
              <SidebarLink
                item={item}
                label={
                  item.to === '/' && todayCount
                    ? `Today, ${todayCount} open tasks`
                    : item.to === '/outreach' && outreachDue
                      ? `Outreach, ${outreachDue} due`
                      : undefined
                }
                badge={
                  item.to === '/' && todayCount ? (
                    <span className="rounded-full bg-brand px-2 py-px text-[11px] font-semibold text-white">
                      {todayCount}
                    </span>
                  ) : item.to === '/outreach' && outreachDue ? (
                    <span className="rounded-full bg-warn-tint px-2 py-px text-[11px] font-semibold text-warn">
                      {outreachDue} due
                    </span>
                  ) : null
                }
              />
            </li>
          ))}
          <li className="md:mt-4 md:border-t md:border-border md:pt-4">
            <SidebarLink item={settingsItem} />
          </li>
        </ul>

        {streakDays !== undefined && (
          <div className="mt-6 hidden md:block">
            <StreakMini days={streakDays} />
          </div>
        )}
      </nav>
    </aside>
  )
}
