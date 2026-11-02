import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DeleteLeadDialog } from './DeleteLeadDialog'

describe('DeleteLeadDialog', () => {
  it('names the lead and confirms or cancels', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn<() => void>()
    const onOpenChange = vi.fn<(open: boolean) => void>()
    render(<DeleteLeadDialog open onOpenChange={onOpenChange} leadName="Emir Kovač" onConfirm={onConfirm} />)

    expect(screen.getByRole('heading', { name: 'Delete this lead?' })).toBeInTheDocument()
    expect(screen.getByText(/“Emir Kovač” will be deleted/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    await user.click(screen.getByRole('button', { name: 'Delete lead' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})
