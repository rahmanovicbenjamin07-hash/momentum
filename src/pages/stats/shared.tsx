import { Loader2 } from 'lucide-react'
import { useId } from 'react'
import { useLocation } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { StatsTabs } from '@/components/stats/StatsTabs'
import { Button } from '@/components/ui/button'

/** Tabs that keep the current ?range / ?year / … when switching. */
export function Tabs() {
  const { search } = useLocation()
  return <StatsTabs search={search} />
}

export function Loading({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-12 text-sm text-ink-3">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  )
}

export function LoadError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <EmptyState title={title} description="Check your connection and try again.">
      <Button onClick={onRetry}>Try again</Button>
    </EmptyState>
  )
}

/** "Year 2026 ▾" picker in the page header. */
export function YearSelect({ value, years, onChange }: { value: number; years: readonly number[]; onChange: (year: number) => void }) {
  const id = useId()
  return (
    <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card pl-3 text-sm print:hidden">
      <label htmlFor={id} className="text-ink-2">
        Year
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-full rounded-r-lg bg-transparent pr-2 font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}
