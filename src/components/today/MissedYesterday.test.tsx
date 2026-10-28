import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MissReason } from '@/schemas/today'
import { MissedYesterday, type MissedItem } from './MissedYesterday'

const read = { id: 'r1', title: 'Read 20 pages' }
const run = { id: 'r2', title: 'Long run' }

function setup(items: MissedItem[], streakSafe = false) {
  const onReason = vi.fn<(item: MissedItem, reason: MissReason) => void>()
  const onDismiss = vi.fn<() => void>()
  const view = render(<MissedYesterday items={items} streakSafe={streakSafe} onReason={onReason} onDismiss={onDismiss} />)
  return { onReason, onDismiss, ...view }
}

describe('MissedYesterday', () => {
  it('asks about the first missed item with six reasons', () => {
    setup([read], true)
    expect(screen.getByRole('heading', { name: 'Yesterday you missed Read 20 pages' })).toBeInTheDocument()
    const reasons = screen.getByRole('group', { name: 'Why did you miss Read 20 pages?' })
    expect(reasons.querySelectorAll('button')).toHaveLength(6)
    expect(screen.getByText(/Your streak is safe/)).toBeInTheDocument()
  })

  it('reports the picked reason', async () => {
    const user = userEvent.setup()
    const { onReason } = setup([read, run])
    await user.click(screen.getByRole('button', { name: 'No time' }))
    expect(onReason).toHaveBeenCalledWith(read, 'No time')
    expect(screen.getByText(/1 more after this/)).toBeInTheDocument()
    expect(screen.queryByText(/streak is safe/)).toBeNull()
  })

  it('can be dismissed', async () => {
    const user = userEvent.setup()
    const { onDismiss } = setup([read])
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('renders nothing when nothing was missed', () => {
    const { container } = setup([])
    expect(container).toBeEmptyDOMElement()
  })
})
