import type { ReactNode } from 'react'

type ReportLayoutProps = {
  /** The share card (left column). */
  share: ReactNode
  highlights: ReactNode
  keyNumbers: ReactNode
  routine: ReactNode
  goals: ReactNode
  lessons: ReactNode
}

/**
 * Reports grid from design/reports.png: share card on the left, the rest on the right.
 * Stacks on phones. When printing ("Download PDF") it keeps two columns at A4 width.
 */
export function ReportLayout({ share, highlights, keyNumbers, routine, goals, lessons }: ReportLayoutProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] print:grid-cols-[260px_minmax(0,1fr)] print:gap-4 print:text-[12px]">
      <div className="self-start lg:sticky lg:top-6 print:static">{share}</div>
      <div className="flex min-w-0 flex-col gap-5 print:gap-4">
        {highlights}
        <div className="grid gap-5 md:grid-cols-2 print:grid-cols-2 print:gap-4">
          {keyNumbers}
          {routine}
        </div>
        <div className="grid gap-5 md:grid-cols-2 print:grid-cols-2 print:gap-4">
          {goals}
          {lessons}
        </div>
      </div>
    </div>
  )
}
