import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  /** Small line above the title, e.g. "Wednesday, 28 October 2026". */
  eyebrow?: string
  /** Buttons on the right (they wrap below the title on small screens). */
  actions?: ReactNode
}

export function PageHeader({ title, eyebrow, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-[13px] font-medium text-ink-2">{eyebrow}</p>}
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-foreground">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
