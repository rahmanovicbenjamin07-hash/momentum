import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TodayHeader } from './TodayHeader'

function setup() {
  const handlers = {
    onPrevDay: vi.fn<() => void>(),
    onToday: vi.fn<() => void>(),
    onNextDay: vi.fn<() => void>(),
    onWeekView: vi.fn<() => void>(),
  }
  // 23:30 UTC on 27 Oct is already 28 Oct in Sarajevo.
  render(<TodayHeader date={new Date('2026-10-27T23:30:00Z')} {...handlers} />)
  return handlers
}

describe('TodayHeader', () => {
  it('shows the long date in Sarajevo time and the title', () => {
    setup()
    expect(screen.getByText('Wednesday, 28 October 2026')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
  })

  it('calls the right handler for each button', async () => {
    const user = userEvent.setup()
    const h = setup()
    await user.click(screen.getByRole('button', { name: 'Previous day' }))
    await user.click(screen.getByRole('button', { name: 'Today' }))
    await user.click(screen.getByRole('button', { name: 'Next day' }))
    await user.click(screen.getByRole('button', { name: 'Week view' }))
    expect(h.onPrevDay).toHaveBeenCalledOnce()
    expect(h.onToday).toHaveBeenCalledOnce()
    expect(h.onNextDay).toHaveBeenCalledOnce()
    expect(h.onWeekView).toHaveBeenCalledOnce()
  })
})
