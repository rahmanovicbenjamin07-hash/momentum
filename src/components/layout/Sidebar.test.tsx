import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Sidebar } from './Sidebar'

function renderAt(path: string, props: Parameters<typeof Sidebar>[0] = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar {...props} />
    </MemoryRouter>,
  )
}

describe('Sidebar', () => {
  it('shows all main links', () => {
    renderAt('/')
    for (const name of ['Today', 'Outreach', 'Stats', 'Goals', 'Improvements', 'Settings']) {
      expect(screen.getByRole('link', { name: new RegExp(`^${name}`) })).toBeInTheDocument()
    }
  })

  it('marks the current page', () => {
    renderAt('/stats/overview')
    expect(screen.getByRole('link', { name: /^Stats/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /^Today/ })).not.toHaveAttribute('aria-current')
  })

  it('shows badges and streak only when given', () => {
    const { unmount } = renderAt('/', { todayCount: 6, outreachDue: 4, streakDays: 12 })
    expect(screen.getByRole('link', { name: /Today, 6 open tasks/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Outreach, 4 due/ })).toBeInTheDocument()
    expect(screen.getByText('12 days')).toBeInTheDocument()
    unmount()

    renderAt('/')
    expect(screen.queryByText(/due/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Current streak/)).not.toBeInTheDocument()
  })
})
