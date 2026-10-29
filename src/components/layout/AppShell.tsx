import type { ReactNode } from 'react'
import { Sidebar, type SidebarProps } from './Sidebar'
import { TopBar, type TopBarProps } from './TopBar'

type AppShellProps = {
  topBar: TopBarProps
  sidebar: SidebarProps
  children: ReactNode
}

/** Dark top bar + white sidebar + content area (max 1200px). Sidebar stacks above content on phones. */
export function AppShell({ topBar, sidebar, children }: AppShellProps) {
  return (
    // When printing (e.g. a report's "Download PDF"), only the page content is printed.
    <div className="flex min-h-svh flex-col print:min-h-0 print:bg-white">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-card px-4 py-2 font-medium text-brand focus:not-sr-only focus:absolute focus:top-3 focus:left-3 print:hidden"
      >
        Skip to content
      </a>
      <div className="contents print:hidden">
        <TopBar {...topBar} />
      </div>
      <div className="flex flex-1 flex-col md:flex-row">
        <div className="contents print:hidden">
          <Sidebar {...sidebar} />
        </div>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 outline-none md:px-8 md:py-8 print:p-0">
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
