import { NavLink, Outlet } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { cn } from '@/lib/utils'

const statsTabs = [
  { slug: 'overview', label: 'Overview' },
  { slug: 'metrics', label: 'Metrics' },
  { slug: 'routine', label: 'Routine' },
  { slug: 'reports', label: 'Reports' },
] as const

export default function StatsPage() {
  return (
    <>
      <PageHeader title="Stats" />
      <nav aria-label="Stats sections" className="mb-6 flex flex-wrap gap-2">
        {statsTabs.map((tab) => (
          <NavLink
            key={tab.slug}
            to={`/stats/${tab.slug}`}
            className={({ isActive }) =>
              cn(
                'inline-flex h-9 items-center rounded-lg border px-3.5 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                isActive
                  ? 'border-brand bg-brand-tint text-brand'
                  : 'border-border bg-card text-foreground hover:bg-muted',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  )
}
