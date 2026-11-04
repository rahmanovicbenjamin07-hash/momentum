import { useId, type ReactNode } from 'react'
import { cn } from 'cn'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { formatTimeRange } from '@/lib/today-list'
import { itemStatus, type TodayItem, type TodayItemStatus } from '@/schemas/today'

type TaskRowProps = {
  item: TodayItem
  /** ✓ / ✗ buttons. Pressing the one that's already on sets the item back to 'open'. */
  onStatus: (item: TodayItem, status: TodayItemStatus) => void
  /** Opens the task pop-up: clicking the title or the pencil. Left out = neither. */
  onEdit?: (item: TodayItem) => void
  /** Trash button. Left out = no button. */
  onDelete?: (item: TodayItem) => void
}

const markButton =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

const iconButton =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

/** The title area: a button that opens the task pop-up, or plain text when there's no `onClick`. */
function TitleWrapper({ onClick, className, children }: { onClick?: () => void; className: string; children: ReactNode }) {
  if (!onClick) return <div className={className}>{children}</div>
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(className, '-my-1 cursor-pointer rounded-lg py-1 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50')}
    >
      {children}
    </button>
  )
}

/**
 * One line in "Today's tasks": ✓ Done and ✗ Not done buttons, title (click it to open the task),
 * a one-line description preview, time, then Edit and Delete. Everything is always visible.
 */
export function TaskRow({ item, onStatus, onEdit, onDelete }: TaskRowProps) {
  const titleId = useId()
  const status = itemStatus(item)
  const done = status === 'done'
  const missed = status === 'missed'

  return (
    <li className="flex min-h-16 items-center gap-2 border-t border-border px-3 py-3 sm:gap-3 sm:px-4" data-status={status}>
      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          aria-label="Done"
          aria-describedby={titleId}
          aria-pressed={done}
          onClick={() => onStatus(item, done ? 'open' : 'done')}
          className={cn(
            markButton,
            done ? 'border-good bg-good text-white' : 'border-border bg-card text-ink-3 hover:bg-good-tint hover:text-good',
          )}
        >
          <Check className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Not done"
          aria-describedby={titleId}
          aria-pressed={missed}
          onClick={() => onStatus(item, missed ? 'open' : 'missed')}
          className={cn(
            markButton,
            missed ? 'border-bad bg-bad text-white' : 'border-border bg-card text-ink-3 hover:bg-bad-tint hover:text-bad',
          )}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {/* Clicking the task opens its pop-up (same as the pencil). */}
      <TitleWrapper
        onClick={onEdit ? () => onEdit(item) : undefined}
        className="min-w-0 flex-1 text-left break-words"
      >
        <span
          id={titleId}
          className={cn(
            'block text-[15px]',
            done && 'text-ink-3 line-through',
            missed && 'text-bad line-through',
            !done && !missed && 'text-foreground',
          )}
        >
          {item.title}
          {missed && <span className="sr-only"> (not done)</span>}
        </span>
        {item.notes && <span className="mt-0.5 line-clamp-1 block text-[13px] text-ink-2">{item.notes}</span>}
      </TitleWrapper>
      <span
        className={cn(
          'shrink-0 text-right text-[15px] whitespace-nowrap tabular-nums',
          item.endTime ? 'sm:w-28' : 'sm:w-16',
          item.time ? 'text-foreground' : 'text-ink-3',
        )}
      >
        {formatTimeRange(item.time, item.endTime)}
      </span>
      {(onEdit || onDelete) && (
        <div className="-mr-1 flex shrink-0 gap-0.5">
          {onEdit && (
            <button
              type="button"
              aria-label="Edit task"
              aria-describedby={titleId}
              onClick={() => onEdit(item)}
              className={cn(iconButton, 'hover:bg-brand-tint hover:text-brand')}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              aria-label="Delete task"
              aria-describedby={titleId}
              onClick={() => onDelete(item)}
              className={cn(iconButton, 'hover:bg-bad-tint hover:text-bad')}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </li>
  )
}
