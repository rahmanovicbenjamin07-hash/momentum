import { useRef, type KeyboardEvent } from 'react'
import { cn } from 'cn'
import { FINANCE_PANEL_ID, FINANCE_TABS, financeTabId, type FinanceTab } from './meta'

type FinanceTabsProps = {
  active: FinanceTab
  onSelect: (tab: FinanceTab) => void
}

/**
 * Logs / Monthly / Yearly / Savings.
 * Real tabs: only the picked one is shown below. Arrow keys, Home and End move between them.
 */
export function FinanceTabs({ active, onSelect }: FinanceTabsProps) {
  const refs = useRef(new Map<FinanceTab, HTMLButtonElement>())

  const onKeyDown = (event: KeyboardEvent) => {
    const index = FINANCE_TABS.findIndex((t) => t.key === active)
    const last = FINANCE_TABS.length - 1
    const next =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null
    const key = next === null ? undefined : FINANCE_TABS[next]?.key
    if (!key) return
    event.preventDefault()
    onSelect(key)
    refs.current.get(key)?.focus()
  }

  return (
    <div className="-mx-1 mb-5 overflow-x-auto shadow-[inset_0_-1px_0_var(--border)]">
      <div role="tablist" aria-label="Finance views" className="flex min-w-max gap-1 px-1">
        {FINANCE_TABS.map((tab) => {
          const selected = active === tab.key
          return (
            <button
              key={tab.key}
              ref={(el) => {
                if (el) refs.current.set(tab.key, el)
                else refs.current.delete(tab.key)
              }}
              type="button"
              role="tab"
              id={financeTabId(tab.key)}
              aria-selected={selected}
              aria-controls={FINANCE_PANEL_ID}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(tab.key)}
              onKeyDown={onKeyDown}
              className={cn(
                'inline-flex h-11 items-center border-b-2 px-3.5 text-sm font-medium whitespace-nowrap outline-none focus-visible:rounded-t-lg focus-visible:ring-3 focus-visible:ring-ring/50',
                selected ? 'border-brand text-brand' : 'border-transparent text-ink-2 hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
