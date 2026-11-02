import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

/**
 * Label + control + optional hint and error, wired up with ids. Used by the goal forms.
 * `floating`: the label sits inside the field like a placeholder and moves up small once
 * there's a value (see index.css → .float-field). Text inputs then need placeholder=" ".
 */
export function GoalField({
  id,
  label,
  hint,
  error,
  floating = false,
  children,
}: {
  id: string
  label: string
  hint?: ReactNode
  error?: string
  floating?: boolean
  children: (describedBy: string | undefined) => ReactNode
}) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className="grid gap-1.5">
      {floating ? (
        <div className="float-field relative">
          {children(describedBy)}
          <Label htmlFor={id}>{label}</Label>
        </div>
      ) : (
        <>
          <Label htmlFor={id}>{label}</Label>
          {children(describedBy)}
        </>
      )}
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
