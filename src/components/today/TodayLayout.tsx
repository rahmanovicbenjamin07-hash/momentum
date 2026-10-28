import type { ReactNode } from 'react'

type TodayLayoutProps = {
  /** Up to three cards; a row of three on wide screens, stacked on phones. */
  topCards?: ReactNode
  /** Full-width quick-add bar under the top cards. */
  quickAdd?: ReactNode
  /** Left column: missed-yesterday, overdue, today's tasks. */
  main: ReactNode
  /** Right column: this week, daily note. Moves under the main column on phones and tablets. */
  aside?: ReactNode
}

/** Page grid for Today. Put TodayHeader above it. */
export function TodayLayout({ topCards, quickAdd, main, aside }: TodayLayoutProps) {
  return (
    <div className="flex flex-col gap-6">
      {topCards && (
        <section aria-label="Overview" className="grid gap-4 lg:grid-cols-3">
          {topCards}
        </section>
      )}
      {quickAdd}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">{main}</div>
        {aside && (
          <aside aria-label="This week and notes" className="flex min-w-0 flex-col gap-4">
            {aside}
          </aside>
        )}
      </div>
    </div>
  )
}
