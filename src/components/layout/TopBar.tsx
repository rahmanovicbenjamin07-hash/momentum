import { Bell, Plus, Search } from 'lucide-react'
import { useEffect, useRef, type FormEvent } from 'react'
import { Logo } from './Logo'
import { UserMenu, type ShellUser } from './UserMenu'

export type TopBarProps = {
  user: ShellUser
  unreadCount?: number
  onSearch: (query: string) => void
  onNew: () => void
  onNotifications: () => void
  onSignOut: () => void
}

export function TopBar({ user, unreadCount = 0, onSearch, onNew, onNotifications, onSignOut }: TopBarProps) {
  const searchRef = useRef<HTMLInputElement>(null)

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = searchRef.current?.value.trim() ?? ''
    if (query) onSearch(query)
  }

  return (
    <header className="bg-topbar text-white">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 md:h-16 md:flex-nowrap md:px-6 md:py-0">
        <Logo />

        <search className="order-last w-full md:order-none md:ml-4 md:max-w-[586px] md:flex-1">
          <form onSubmit={handleSubmit}>
            <label htmlFor="global-search" className="sr-only">
              Search
            </label>
            <div className="flex h-10 items-center gap-2.5 rounded-lg border border-[#374151] bg-[#1F2937] px-3 focus-within:border-[#6366F1] focus-within:ring-3 focus-within:ring-[#6366F1]/40">
              <Search className="size-4 shrink-0 text-[#D1D5DB]" aria-hidden="true" />
              <input
                ref={searchRef}
                id="global-search"
                type="search"
                placeholder="Search tasks, contacts, notes..."
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#9CA3AF]"
              />
              <kbd className="hidden shrink-0 rounded-md border border-[#4B5563] px-1.5 py-0.5 font-sans text-[11px] text-[#D1D5DB] sm:inline-block">
                Ctrl K
              </kbd>
            </div>
            </form>
          </search>
  
        <div className="ml-auto flex items-center gap-3 md:gap-4">
          <button
            type="button"
            onClick={onNew}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-topbar-button px-4 text-sm font-semibold text-white outline-none hover:bg-[#4338CA] focus-visible:ring-3 focus-visible:ring-white/50"
          >
            <Plus className="size-4" aria-hidden="true" />
            New
          </button>

          <button
            type="button"
            onClick={onNotifications}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            className="relative grid size-9 place-items-center rounded-lg text-[#E5E7EB] outline-none hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/50"
          >
            <Bell className="size-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#F97316]" aria-hidden="true" />
            )}
          </button>

          <UserMenu user={user} onSignOut={onSignOut} />
        </div>
      </div>
    </header>
  )
}
