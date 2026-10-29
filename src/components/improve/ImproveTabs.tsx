import { useRef, type KeyboardEvent } from 'react'
import { cn } from 'cn'
import { improvePanelId, improveTabId, type ImproveTab } from './meta'

type ImproveTabsProps = {
  active: ImproveTab
  counts: { lessons: number; experiments: number; ideas: number }
  onChange: (tab: ImproveTab) => void
}

const TABS: { key: ImproveTab; label: string }[] = [
  { key: 'review', label: 'Weekly review' },
  { key: 'lessons', label: 'Lessons' },
  { key: 'experiments', label: 'Experiments' },
  { key: 'ideas', label: 'Ideas' },
]

/** Weekly review / Lessons 5 / Experiments 3 / Ideas 4. Arrow keys, Home and End move between tabs. */
export function ImproveTabs({ active, counts, onChange }: ImproveTabsProps) {
  const refs = useRef<Partial<Record<ImproveTab, HTMLButtonElement | null>>>({})

  const onKeyDown = (event: KeyboardEvent) => {
    const index = TABS.findIndex((t) => t.key === active)
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % TABS.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + TABS.length) % TABS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? TABS.length - 1
              : null
    const tab = next === null ? undefined : TABS[next]?.key
    if (!tab) return
    event.preventDefault()
    onChange(tab)
    refs.current[tab]?.focus()
  }

  return (
    <div className="-mx-1 mb-5 overflow-x-auto border-b border-border">
      <div role="tablist" aria-label="Improvements sections" className="flex min-w-max gap-1 px-1">
        {TABS.map((tab) => {
          const selected = tab.key === active
          const count = tab.key === 'review' ? null : counts[tab.key]
          return (
            <button
              key={tab.key}
              ref={(el) => {
                refs.current[tab.key] = el
              }}
              type="button"
              role="tab"
              id={improveTabId(tab.key)}
              aria-selected={selected}
              aria-controls={improvePanelId(tab.key)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.key)}
              onKeyDown={onKeyDown}
              className={cn(
                '-mb-px inline-flex h-11 items-center gap-1.5 border-b-2 px-3.5 text-sm font-medium whitespace-nowrap outline-none focus-visible:rounded-t-lg focus-visible:ring-3 focus-visible:ring-ring/50',
                selected ? 'border-brand text-brand' : 'border-transparent text-ink-2 hover:text-foreground',
              )}
            >
              {tab.label}
              {count !== null && <span className="text-xs font-normal text-ink-2 tabular-nums">{count}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
