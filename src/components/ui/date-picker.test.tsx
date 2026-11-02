import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DatePicker } from './date-picker'

const today = '2026-10-28'

describe('DatePicker', () => {
  it('shows the date, opens on the selected month and picks a day', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(value: string) => void>()
    render(<DatePicker aria-label="Deadline" value="2026-11-15" onChange={onChange} today={today} />)

    const trigger = screen.getByRole('button', { name: 'Deadline' })
    expect(trigger).toHaveTextContent('15 Nov 2026')
    await user.click(trigger)
    expect(screen.getByText('November 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sunday, 15 November 2026' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Sunday, 15 November 2026' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByText('December 2026')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Thursday, 24 December 2026' }))
    expect(onChange).toHaveBeenCalledWith('2026-12-24')
    expect(screen.queryByText('December 2026')).not.toBeInTheDocument()
  })

  it('moves with the keyboard and picks with Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(value: string) => void>()
    render(<DatePicker aria-label="Start date" value="" onChange={onChange} today={today} />)

    expect(screen.getByRole('button', { name: 'Start date' })).toHaveTextContent('Pick a date')
    await user.click(screen.getByRole('button', { name: 'Start date' }))
    expect(screen.getByRole('button', { name: 'Wednesday, 28 October 2026' })).toHaveFocus()
    await user.keyboard('{ArrowDown}{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Thursday, 5 November 2026' })).toHaveFocus()
    expect(screen.getByText('November 2026')).toBeInTheDocument()
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith('2026-11-05')
  })

  it('blocks days outside min / max, and can clear', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(value: string) => void>()
    render(<DatePicker aria-label="Due" value="2026-10-30" min="2026-10-29" onChange={onChange} today={today} clearable />)

    await user.click(screen.getByRole('button', { name: 'Due' }))
    expect(screen.getByRole('button', { name: 'Wednesday, 28 October 2026' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Today' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onChange).toHaveBeenCalledWith('')
  })
})
