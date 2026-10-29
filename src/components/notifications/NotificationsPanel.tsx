import { useEffect, useId, useRef, type RefObject } from 'react'
import { Link } from 'react-router'
import { cn } from 'cn'
import type { Notification, NotificationKind } from '@/schemas/settings'

export type NotificationItem = Pick<Notification, 'id' | 'kind' | 'title' | 'body' | 'link' | 'read_at'> & {
  /** Already formatted: "09:00" today, "Yesterday", or a weekday like "Sun". */
  timeLabel: string
}

export type NotificationsPanelProps = {
  /** Newest first. */
  items: NotificationItem[]
  onMarkAllRead: () => void
  onOpen: (item: NotificationItem) => void
  onClose: () => void
  /** The bell: clicks on it don't count as "outside", so the bell can toggle the panel itself. */
  anchorRef?: RefObject<HTMLElement | null>
}

const KIND_AVATAR: Record<NotificationKind, { initial: string; className: string }> = {
  followup_due: { initial: 'F', className: 'bg-info-tint text-info' },
  followup_late: { initial: '!', className: 'bg-bad-tint text-bad' },
  routine: { initial: 'R', className: 'bg-good-tint text-good' },
  anytime: { initial: 'A', className: 'bg-good-tint text-good' },
  close_day: { initial: 'D', className: 'bg-muted text-ink-2' },
  weekly_review: { initial: 'W', className: 'bg-muted text-ink-2' },
}

/**
 * Bell dropdown: 360px panel under the bell. Focus moves into it when it opens;
 * Escape or a click outside closes it.
 */
export function NotificationsPanel({ items, onMarkAllRead, onOpen, onClose, anchorRef }: NotificationsPanelProps) {
  const id = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const unread = items.filter((item) => item.read_at === null).length

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || anchorRef?.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [onClose, anchorRef])

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      className={cn(
        // Phones: full width under the top bar's first row. Wider screens: 360px under the bell.
        'absolute inset-x-4 top-[60px] z-50 overflow-hidden rounded-xl border border-border bg-card text-left text-foreground outline-none',
        'sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-[360px]',
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 id={`${id}-title`} className="text-[15px] font-semibold">
          Notifications
        </h2>
        {unread > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="rounded-md text-[13px] font-semibold text-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Mark all read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink-2">You’re all caught up.</p>
      ) : (
        <ul className="max-h-[min(420px,65vh)] divide-y divide-border overflow-y-auto">
          {items.map((item) => {
            const avatar = KIND_AVATAR[item.kind]
            const isUnread = item.read_at === null
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
                    isUnread ? 'bg-brand-tint hover:bg-brand-tint/70' : 'hover:bg-muted',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn('grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold', avatar.className)}
                  >
                    {avatar.initial}
                  </span>
                  <span className="min-w-0 flex-1">
                    {isUnread && <span className="sr-only">Unread: </span>}
                    <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                    {item.body && <span className="block text-xs text-ink-2">{item.body}</span>}
                  </span>
                  <span className="shrink-0 pt-0.5 text-[11px] text-ink-2 tabular-nums">{item.timeLabel}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="border-t border-border">
        <Link
          to="/settings"
          onClick={onClose}
          className="block py-3 text-center text-[13px] font-semibold text-brand outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
        >
          Notification settings
        </Link>
      </div>
    </div>
  )
}
