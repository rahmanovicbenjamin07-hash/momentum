import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockTemplates } from '@/mocks/outreach'
import type { TemplateFormValues } from '@/schemas/outreach'
import { TemplatesDialog } from './TemplatesDialog'

function setup(templates = mockTemplates) {
  const onSave = vi.fn<(values: TemplateFormValues, id?: string) => void>()
  render(<TemplatesDialog open onOpenChange={() => {}} templates={templates} onSave={onSave} />)
  return { onSave, user: userEvent.setup() }
}

describe('TemplatesDialog', () => {
  it('lists templates with their channel', () => {
    setup()
    expect(screen.getByRole('heading', { name: 'Templates' })).toBeInTheDocument()
    expect(screen.getByText('LinkedIn first message')).toBeInTheDocument()
    expect(screen.getByText('Any channel')).toBeInTheDocument()
  })

  it('shows an empty message without templates', () => {
    setup([])
    expect(screen.getByText(/No templates yet/)).toBeInTheDocument()
  })

  it('edits a template with a live preview and saves it with its id', async () => {
    const { user, onSave } = setup()
    await user.click(screen.getByRole('button', { name: 'Edit LinkedIn first message' }))
    expect(screen.getByRole('heading', { name: 'Edit template' })).toBeInTheDocument()
    expect(screen.getByText(/^Hi Emir, I liked/)).toBeInTheDocument()

    const name = screen.getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'LinkedIn hello')
    await user.click(screen.getByRole('button', { name: 'Save template' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'LinkedIn hello', channel: 'linkedin' }), mockTemplates[0]!.id)
    expect(await screen.findByRole('heading', { name: 'Templates' })).toBeInTheDocument()
  })

  it('adds a new template, inserting {{first_name}}', async () => {
    const { user, onSave } = setup()
    await user.click(screen.getByRole('button', { name: 'New template' }))
    await user.type(screen.getByLabelText('Name'), 'Quick hello')
    await user.type(screen.getByLabelText('Message'), 'Hi ')
    await user.click(screen.getByRole('button', { name: 'Insert {{first_name}}' }))
    expect(screen.getByLabelText('Message')).toHaveValue('Hi {{first_name}}')
    expect(screen.getByText('Hi Emir')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save template' }))
    expect(onSave).toHaveBeenCalledWith({ name: 'Quick hello', channel: undefined, body: 'Hi {{first_name}}' }, undefined)
  })

  it('needs a name and a message', async () => {
    const { user, onSave } = setup()
    await user.click(screen.getByRole('button', { name: 'New template' }))
    await user.click(screen.getByRole('button', { name: 'Save template' }))
    expect(await screen.findByText('Name the template')).toBeInTheDocument()
    expect(screen.getByText('Write the message')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })
})
