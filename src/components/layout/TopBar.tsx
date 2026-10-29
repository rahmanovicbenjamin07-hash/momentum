import { Bell, Plus, Search } from 'lucide-react'
import { useEffect, useRef, type FormEvent } from 'react'
import { NotificationsPanel, type NotificationsPanelProps } from '@/components/notifications/NotificationsPanel'
import { Logo } from './Logo'
import { UserMenu, type ShellUser } from './UserMenu'

export type TopBarProps = {
  user: ShellUser
  /** Orange dot on the bell when above 0. */
  unreadCount?: number
  onSearch: (query: string) => void
  onNew: () => void
  /** Bell click: open or close the panel. */
  onNotifications: () => void
  onSignOut: () => void
  /** Pass the panel's props while it is open; leave out (undefined) when closed. */
  notificationsPanel?: Omit<NotificationsPanelProps, 'anchorRef'>
}

export function TopBar({
  user,
  unreadCount = 0,
  onSearch,
  onNew,
  onNotifications,
  onSignOut,
  notificationsPanel,
}: TopBarProps) {
  const searchRef = useRef<HTMLInputElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const panelOpen = notificationsPanel !== undefined
  const wasOpen = useRef(panelOpen)

  // Ctrl+K (Cmd+K on Mac) jumps to the search box from anywhere.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // When the panel closes with focus inside it (e.g. Escape), focus goes back to the bell.
  useEffect(() => {
    const active = document.activeElement
    if (wasOpen.current && !panelOpen && (active === null || active === document.body)) bellRef.current?.focus()
    wasOpen.current = panelOpen
  }, [panelOpen])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = searchRef.current?.value.trim() ?? ''
    if (query) onSearch(query)
  }

  return (
    <header className="relative bg-topbar text-white">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 md:h-16 md:flex-nowrap md:px-6 md:py-0">
        <Logo />

        <search className="order-last w-full md:order-none md:ml-4 md:max-w-[586px] md:flex-1">
          <form onSubmit={handleSubmit}>
            <label htmlFor="global-search" className="sr-only">
              Search
            </label>
            <div className="flex h-10 items-center gap-2.5 rounded-lg border border-topbar-line bg-topbar-field px-3 focus-within:border-topbar-focus focus-within:ring-3 focus-within:ring-topbar-focus/40">
              <Search className="size-4 shrink-0 text-topbar-text" aria-hidden="true" />
              <input
                ref={searchRef}
                id="global-search"
                type="search"
                placeholder="Search tasks, contacts, notes..."
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-topbar-muted"
              />
              <kbd className="hidden shrink-0 rounded-md border border-topbar-line-strong px-1.5 py-0.5 font-sans text-[11px] text-topbar-text sm:inline-block">
                Ctrl K
              </kbd>
            </div>
          </form>
        </search>

        <div className="ml-auto flex items-center gap-3 md:gap-4">
          <button
            type="button"
            onClick={onNew}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-topbar-button px-4 text-sm font-semibold text-white outline-none hover:bg-topbar-button-hover focus-visible:ring-3 focus-visible:ring-white/50"
          >
            <Plus className="size-4" aria-hidden="true" />
            New
          </button>

          {/* On phones the panel spans the header width, so only wider screens anchor it to the bell. */}
          <div className="sm:relative">
            <button
              ref={bellRef}
              type="button"
              onClick={onNotifications}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              aria-haspopup="dialog"
              aria-expanded={panelOpen}
              className="relative grid size-9 place-items-center rounded-lg text-topbar-text outline-none hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/50 aria-expanded:bg-white/10"
            >
              <Bell className="size-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-notify" aria-hidden="true" />
              )}
            </button>
            {notificationsPanel && <NotificationsPanel {...notificationsPanel} anchorRef={bellRef} />}
          </div>

          <UserMenu user={user} onSignOut={onSignOut} />
        </div>
      </div>
    </header>
  )
}
