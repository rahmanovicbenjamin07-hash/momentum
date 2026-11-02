import type { ReactNode } from 'react'

type TodayLayoutProps = {
  /** Two cards (progress and streak): side by side from tablet width, stacked on phones. */
  topCards?: ReactNode
  /** Left column: missed-yesterday, overdue, today's tasks. */
  main: ReactNode
  /** Right column: this week, daily note. Moves under the main column on phones and tablets. */
  aside?: ReactNode
}

/** Page grid for Today. Put TodayHeader above it. Cards inside get the frosted-glass look (see index.css → .today-glass). */
export function TodayLayout({ topCards, main, aside }: TodayLayoutProps) {
  return (
    <div className="today-glass flex flex-col gap-6">
      {topCards && (
        <section aria-label="Overview" className="grid gap-4 sm:grid-cols-2">
          {topCards}
        </section>
      )}
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
