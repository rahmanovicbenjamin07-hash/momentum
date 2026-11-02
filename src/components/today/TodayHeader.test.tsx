import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TodayHeader } from './TodayHeader'

function setup(today = '2026-10-28') {
  const handlers = {
    onPrevDay: vi.fn<() => void>(),
    onToday: vi.fn<() => void>(),
    onNextDay: vi.fn<() => void>(),
    onWeekView: vi.fn<() => void>(),
  }
  // 23:30 UTC on 27 Oct is already 28 Oct in Sarajevo.
  render(<TodayHeader date={new Date('2026-10-27T23:30:00Z')} today={today} {...handlers} />)
  return handlers
}

describe('TodayHeader', () => {
  it('shows the long date in Sarajevo time and the title', () => {
    setup()
    expect(screen.getByText('Wednesday, 28 October 2026')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
  })

  it('names the shown day relative to today', () => {
    setup('2026-10-27')
    expect(screen.getByRole('heading', { level: 1, name: 'Tomorrow' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tomorrow, go back to today' })).toHaveTextContent('Tomorrow')
  })

  it('says Yesterday for the day before', () => {
    setup('2026-10-29')
    expect(screen.getByRole('heading', { level: 1, name: 'Yesterday' })).toBeInTheDocument()
  })

  it('shows the short date when the day is further away', () => {
    setup('2026-11-02')
    expect(screen.getByRole('heading', { level: 1, name: '28 Oct 2026' })).toBeInTheDocument()
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
