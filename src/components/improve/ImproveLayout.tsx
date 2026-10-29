import type { ReactNode } from 'react'

type ImproveLayoutProps = {
  main: ReactNode
  aside: ReactNode
}

/** Main column + 320px right column; the right column drops under the main one below 1024px. */
export function ImproveLayout({ main, aside }: ImproveLayoutProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-4">{main}</div>
      <aside aria-label="This week at a glance" className="flex min-w-0 flex-col gap-4">
        {aside}
      </aside>
    </div>
  )
}
