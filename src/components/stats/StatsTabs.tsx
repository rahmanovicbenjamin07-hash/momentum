import { NavLink } from 'react-router'
import { cn } from 'cn'

const STATS_TABS = [
  { slug: 'overview', label: 'Overview' },
  { slug: 'metrics', label: 'My metrics' },
  { slug: 'routine', label: 'Routine progress' },
  { slug: 'reports', label: 'Reports' },
] as const

type StatsTabsProps = {
  /** Kept on every tab link, e.g. "?range=30", so the chosen range survives switching tabs. */
  search?: string
}

/** Overview / My metrics / Routine progress / Reports. Real links; the current one is underlined. */
export function StatsTabs({ search = '' }: StatsTabsProps) {
  return (
    <nav aria-label="Stats sections" className="-mx-1 mb-5 overflow-x-auto border-b border-border print:hidden">
      <ul className="flex min-w-max gap-1 px-1">
        {STATS_TABS.map((tab) => (
          <li key={tab.slug}>
            <NavLink
              to={{ pathname: `/stats/${tab.slug}`, search }}
              className={({ isActive }) =>
                cn(
                  '-mb-px inline-flex h-11 items-center border-b-2 px-3.5 text-sm font-medium whitespace-nowrap outline-none focus-visible:rounded-t-lg focus-visible:ring-3 focus-visible:ring-ring/50',
                  isActive ? 'border-brand text-brand' : 'border-transparent text-ink-2 hover:text-foreground',
                )
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
