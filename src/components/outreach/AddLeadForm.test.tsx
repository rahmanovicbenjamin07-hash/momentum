import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AddLeadFormValues } from '@/schemas/outreach'
import { AddLeadForm, type AddLeadFormProps } from './AddLeadForm'

function setup(props: Partial<AddLeadFormProps> = {}) {
  const onSubmit = vi.fn<(values: AddLeadFormValues) => void>()
  const onCancel = vi.fn<() => void>()
  render(<AddLeadForm onSubmit={onSubmit} onCancel={onCancel} {...props} />)
  return { onSubmit, onCancel, user: userEvent.setup() }
}

describe('AddLeadForm', () => {
  it('asks for a source first', async () => {
    const { user } = setup()
    expect(screen.getByText('Pick a source to see the fields for it.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save lead' })).toBeDisabled()

    await user.click(screen.getByRole('radio', { name: 'LinkedIn' }))
    expect(screen.getByLabelText('Profile link')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save lead' })).toBeEnabled()
  })

  it('shows each source’s own fields', async () => {
    const { user } = setup({ defaultSource: 'maps' })
    expect(screen.getByLabelText('Business name')).toBeInTheDocument()
    expect(screen.getByLabelText('Google Maps link')).toBeInTheDocument()
    expect(screen.getByText(/often your best opening/)).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Upwork' }))
    expect(screen.getByLabelText('Job title')).toBeInTheDocument()
    expect(screen.getByLabelText('Connects spent')).toBeInTheDocument()
    expect(screen.getByLabelText('Proposal status')).toHaveValue('sent')
    expect(screen.queryByLabelText('Business name')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'In person' }))
    expect(screen.getByLabelText('Where we met')).toBeInTheDocument()
  })

  it('shows errors and does not save an incomplete lead', async () => {
    const { user, onSubmit } = setup({ defaultSource: 'linkedin' })
    await user.click(screen.getByRole('button', { name: 'Save lead' }))
    expect(await screen.findByText('Enter their name')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Paste the link')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('saves a Google Maps lead with the chosen follow-up', async () => {
    const { user, onSubmit } = setup({ defaultSource: 'maps' })
    await user.type(screen.getByLabelText('Business name'), 'Café Rondo')
    await user.type(screen.getByLabelText('Address or city'), 'Sarajevo')
    await user.selectOptions(screen.getByLabelText('First follow-up'), 'In a week')
    await user.click(screen.getByRole('button', { name: 'Save lead' }))

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      source: 'maps',
      name: 'Café Rondo',
      city: 'Sarajevo',
      follow_up: 'week',
      website: undefined,
    })
  })

  it('reports drafts, shows the duplicate warning, and shows save errors', async () => {
    const onDraftChange = vi.fn<(draft: unknown) => void>()
    const { user } = setup({
      defaultSource: 'linkedin',
      onDraftChange,
      duplicateWarning: 'Emir Kovač already has this link.',
      onSubmit: () => {
        throw new Error('No connection')
      },
    })
    expect(screen.getByText('Emir Kovač already has this link.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Name'), 'Emir')
    expect(onDraftChange).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Emir', source: 'linkedin' }))

    await user.type(screen.getByLabelText('Profile link'), 'linkedin.com/in/emir')
    await user.click(screen.getByRole('button', { name: 'Save lead' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No connection')
  })

  it('cancels with Cancel or the close button', async () => {
    const { user, onCancel } = setup()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onCancel).toHaveBeenCalledTimes(2)
  })
})
