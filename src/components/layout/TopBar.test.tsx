import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { TopBar } from './TopBar'

function setup() {
  const handlers = {
    onSearch: vi.fn<(query: string) => void>(),
    onNew: vi.fn<() => void>(),
    onNotifications: vi.fn<() => void>(),
    onSignOut: vi.fn<() => void>(),
  }
  render(
    <MemoryRouter>
      <TopBar user={{ name: 'Benjamin Rahmanović', email: 'b@example.com' }} {...handlers} />
    </MemoryRouter>,
  )
  return handlers
}

describe('TopBar', () => {
  it('focuses search on Ctrl+K', async () => {
    const user = userEvent.setup()
    setup()
    const search = screen.getByRole('searchbox', { name: 'Search' })
    expect(search).not.toHaveFocus()
    await user.keyboard('{Control>}k{/Control}')
    expect(search).toHaveFocus()
  })

  it('submits a trimmed search query', async () => {
    const user = userEvent.setup()
    const { onSearch } = setup()
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), '  amir {Enter}')
    expect(onSearch).toHaveBeenCalledWith('amir')
  })

  it('shows initials and calls onNew', async () => {
    const user = userEvent.setup()
    const { onNew } = setup()
    expect(screen.getByRole('button', { name: 'Account menu' })).toHaveTextContent('BR')
    await user.click(screen.getByRole('button', { name: 'New' }))
    expect(onNew).toHaveBeenCalledOnce()
  })
})
