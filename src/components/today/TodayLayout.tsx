import type { ReactNode } from 'react'

type TodayLayoutProps = {
  /** Left column: missed-yesterday, overdue, today's and tomorrow's tasks. Gets the full page height. */
  main: ReactNode
  /** Right column: progress, streak, this week, daily note. Moves under the main column on phones and tablets. */
  aside?: ReactNode
}

/** Page grid for Today. Put TodayHeader above it. Cards inside get the frosted-glass look (see index.css → .today-glass). */
export function TodayLayout({ main, aside }: TodayLayoutProps) {
  return (
    <div className="today-glass grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-4">{main}</div>
      {aside && (
        <aside aria-label="Progress, week and notes" className="flex min-w-0 flex-col gap-4">
          {aside}
        </aside>
      )}
    </div>
  )
}
