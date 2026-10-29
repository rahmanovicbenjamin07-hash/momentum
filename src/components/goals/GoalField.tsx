import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

/** Label + control + optional hint and error, wired up with ids. Used by the goal forms. */
export function GoalField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: ReactNode
  error?: string
  children: (describedBy: string | undefined) => ReactNode
}) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children(describedBy)}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-ink-2">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-bad">
          {error}
        </p>
      )}
    </div>
  )
}

export const goalSelectClass =
  'h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-bad'
