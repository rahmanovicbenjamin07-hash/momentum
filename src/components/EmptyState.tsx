import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description?: string
  children?: ReactNode
}

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <section className="rounded-xl border border-border bg-card px-6 py-12 text-center">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">{description}</p>}
      {children && <div className="mt-4 flex justify-center gap-2">{children}</div>}
    </section>
  )
}
