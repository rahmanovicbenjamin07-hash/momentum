import { cn } from 'cn'
import { SOURCE_META, type LeadSource } from './meta'

/** Coloured "Found on" chip with an icon, e.g. [pin] Google Maps. */
export function SourceChip({ source, className }: { source: LeadSource; className?: string }) {
  const { label, icon: Icon, className: tone } = SOURCE_META[source]
  return (
    <span
      className={cn(
        'inline-flex h-6 w-fit items-center gap-1.5 rounded-lg px-2 text-xs font-semibold whitespace-nowrap',
        tone,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {label}
    </span>
  )
}
