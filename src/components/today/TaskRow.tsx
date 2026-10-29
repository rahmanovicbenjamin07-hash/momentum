import { useId } from 'react'
import { cn } from 'cn'
import { Repeat, Trash2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatRepeatDays, tagLabel, tagTone, type TagTone } from '@/lib/today-list'
import type { Priority, TodayItem } from '@/schemas/today'

const TONE_CLASSES: Record<TagTone, string> = {
  brand: 'bg-brand-tint text-brand',
  info: 'bg-info-tint text-info',
  neutral: 'bg-muted text-ink-2',
  pink: 'bg-tag-pink-tint text-tag-pink',
  good: 'bg-good-tint text-good',
  warn: 'bg-warn-tint text-warn',
}

const PRIORITY: Record<Priority, { label: string; className: string }> = {
  high: { label: 'High', className: 'text-bad' },
  medium: { label: 'Medium', className: 'text-warn' },
  low: { label: 'Low', className: 'text-ink-3' },
}

const chip = 'inline-flex h-6 items-center gap-1 rounded-lg px-2 text-xs font-medium whitespace-nowrap'

type TaskRowProps = {
  item: TodayItem
  onToggle: (item: TodayItem, done: boolean) => void
  /** Trash button. Left out = no button. */
  onDelete?: (item: TodayItem) => void
}

/**
 * One line in "Today's tasks": checkbox, title, repeating chip or tag + priority, time, trash.
 * The trash button shows on hover / keyboard focus where there's a mouse, and always on touch screens.
 */
export function TaskRow({ item, onToggle, onDelete }: TaskRowProps) {
  const checkboxId = useId()
  const titleId = useId()

  return (
    <li
      className="group flex min-h-16 items-center gap-3 border-t border-border px-4 py-3"
      data-done={item.done || undefined}
    >
      <Checkbox
        id={checkboxId}
        checked={item.done}
        onCheckedChange={(checked) => onToggle(item, checked === true)}
        className="size-[18px] border-ink-3"
      />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
        <label
          id={titleId}
          htmlFor={checkboxId}
          className={cn(
            'min-w-0 flex-1 basis-56 cursor-pointer text-[15px] break-words',
            item.done ? 'text-ink-3 line-through' : 'text-foreground',
          )}
        >
          {item.title}
        </label>
        <div className="flex items-center gap-3">
          {item.kind === 'routine' ? (
            <span className={cn(chip, TONE_CLASSES.brand)}>
              <Repeat className="size-3" aria-hidden="true" />
              Repeating · {formatRepeatDays(item.days ?? [])}
            </span>
          ) : (
            <>
              {item.tag && <span className={cn(chip, TONE_CLASSES[tagTone(item.tag)])}>{tagLabel(item.tag)}</span>}
              {item.priority && (
                <span className={cn('text-[13px] font-medium sm:w-14', PRIORITY[item.priority].className)}>
                  <span className="sr-only">Priority: </span>
                  {PRIORITY[item.priority].label}
                </span>
              )}
            </>
          )}
          <span className={cn('text-[15px] sm:w-16 sm:text-right', item.time ? 'text-foreground' : 'text-ink-3')}>
            {item.time ?? 'Anytime'}
          </span>
        </div>
      </div>
      {onDelete && (
        <button
          type="button"
          aria-label="Delete task"
          aria-describedby={titleId}
          onClick={() => onDelete(item)}
          className={cn(
            '-mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-3 outline-none',
            'hover:bg-bad-tint hover:text-bad focus-visible:text-bad focus-visible:ring-3 focus-visible:ring-ring/50',
            // Mouse/trackpad: hidden until the row is hovered or something in it has focus. Touch: always shown.
            '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100',
          )}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      )}
    </li>
  )
}
