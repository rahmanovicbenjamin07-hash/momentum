import { LogOut, Settings } from 'lucide-react'
import { Link } from 'react-router'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getInitials } from '@/lib/initials'

export type ShellUser = {
  name: string | null
  email: string
}

type UserMenuProps = {
  user: ShellUser
  onSignOut: () => void
}

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  const initials = getInitials(user.name || user.email)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-[#374151] text-[13px] font-semibold text-white outline-none hover:bg-[#4B5563] focus-visible:ring-3 focus-visible:ring-white/50"
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          {user.name && <span className="truncate text-sm font-semibold text-foreground">{user.name}</span>}
          <span className="truncate text-xs font-normal text-ink-3">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to="/settings">
              <Settings />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onSignOut}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
