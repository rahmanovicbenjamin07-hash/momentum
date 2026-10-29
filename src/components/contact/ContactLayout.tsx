import type { ReactNode } from 'react'

type ContactLayoutProps = {
  /** Breadcrumb + summary card. */
  header: ReactNode
  /** Narrow left column: details, notes, linked tasks. */
  aside: ReactNode
  /** Wide right column: log a touch, timeline. */
  main: ReactNode
}

/** Contact page grid. Below 1024px the columns stack, with the touch form and timeline first. */
export function ContactLayout({ header, aside, main }: ContactLayoutProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>{header}</div>
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="order-2 flex flex-col gap-5 lg:order-1">{aside}</div>
        <div className="order-1 flex min-w-0 flex-col gap-5 lg:order-2">{main}</div>
      </div>
    </div>
  )
}
