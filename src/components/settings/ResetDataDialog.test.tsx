import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResetDataDialog } from './ResetDataDialog'

function setup(onConfirm = vi.fn<() => Promise<void> | void>()) {
  const onOpenChange = vi.fn<(open: boolean) => void>()
  const onExportJson = vi.fn<() => void>()
  render(<ResetDataDialog open onOpenChange={onOpenChange} onExportJson={onExportJson} onConfirm={onConfirm} />)
  return { onConfirm, onOpenChange, onExportJson }
}

describe('ResetDataDialog', () => {
  it('only resets after typing RESET exactly', async () => {
    const user = userEvent.setup()
    const h = setup()
    const button = screen.getByRole('button', { name: 'Reset everything' })
    expect(button).toBeDisabled()

    await user.type(screen.getByLabelText('Type RESET to confirm'), 'reset')
    expect(button).toBeDisabled()

    await user.clear(screen.getByLabelText('Type RESET to confirm'))
    await user.type(screen.getByLabelText('Type RESET to confirm'), 'RESET')
    await user.click(button)
    expect(h.onConfirm).toHaveBeenCalledTimes(1)
    expect(h.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('offers a copy first', async () => {
    const user = userEvent.setup()
    const h = setup()
    await user.click(screen.getByRole('button', { name: 'Download a copy first (JSON)' }))
    expect(h.onExportJson).toHaveBeenCalledTimes(1)
  })

  it('shows the error and stays open when the reset fails', async () => {
    const user = userEvent.setup()
    const h = setup(vi.fn<() => Promise<void>>().mockRejectedValue(new Error("Couldn't reset your data. Nothing was deleted.")))
    await user.type(screen.getByLabelText('Type RESET to confirm'), 'RESET{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't reset your data. Nothing was deleted.")
    expect(h.onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
