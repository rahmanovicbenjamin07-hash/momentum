import { ChartLine } from 'lucide-react'
import { Link } from 'react-router'

export function Logo() {
  return (
    <Link
      to="/"
      className="flex shrink-0 items-center gap-2.5 rounded-lg text-white outline-none focus-visible:ring-3 focus-visible:ring-white/50"
    >
      <span className="grid size-7 place-items-center rounded-lg bg-topbar-button" aria-hidden="true">
        <ChartLine className="size-4" strokeWidth={2.5} />
      </span>
      <span className="text-[17px] font-semibold tracking-tight">Momentum</span>
    </Link>
  )
}
