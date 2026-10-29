import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockContactDetail, mockTemplates, mockTouches } from '@/mocks/outreach'
import type { LogTouchFormValues } from '@/schemas/outreach'
import { LogTouchForm } from './LogTouchForm'
import { NotesCard, type NoteDraft } from './NotesCard'
import { Timeline } from './Timeline'
import { WonPanel, type WonPanelValues } from './WonPanel'

const today = '2026-10-28'

describe('LogTouchForm', () => {
  it('fills a template with the first name and saves a sent touch', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn<(v: LogTouchFormValues) => void>()
    render(<LogTouchForm contactName="Emir Kovač" defaultChannel="linkedin" templates={mockTemplates} onSubmit={onSubmit} />)

    expect(screen.getByLabelText('Channel')).toHaveValue('linkedin')
    expect(screen.getByRole('radio', { name: 'Sent' })).toBeChecked()
    // Phone-only template is hidden for LinkedIn.
    expect(within(screen.getByLabelText('Template')).queryByRole('option', { name: 'No website — call script' })).toBeNull()

    await user.selectOptions(screen.getByLabelText('Template'), 'Opener A')
    expect((screen.getByLabelText('Message or summary') as HTMLTextAreaElement).value).toMatch(
      /^Hi Emir, congrats on the new studio launch/,
    )
    expect(screen.getByText(/sets the next follow-up 3 days out/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save touch' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'linkedin', direction: 'sent', template_id: mockTemplates[3]!.id, got_reply: false }),
    )
    expect(screen.getByLabelText('Message or summary')).toHaveValue('')
  })

  it('marks received touches as a reply, and needs text for a note', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn<(v: LogTouchFormValues) => void>()
    render(<LogTouchForm contactName="Emir" templates={[]} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('radio', { name: 'Note' }))
    await user.click(screen.getByRole('button', { name: 'Save touch' }))
    expect(await screen.findByText('Write the note')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    await user.click(screen.getByRole('radio', { name: 'Received' }))
    await user.type(screen.getByLabelText('Message or summary'), 'Sounds good')
    await user.click(screen.getByRole('button', { name: 'Save touch' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'email', direction: 'received', body: 'Sounds good', got_reply: true }),
    )
  })

  it('shows a save error', async () => {
    const user = userEvent.setup()
    render(
      <LogTouchForm
        contactName="Emir"
        templates={[]}
        onSubmit={() => {
          throw new Error('Offline')
        }}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Save touch' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline')
  })
})

describe('Timeline', () => {
  it('lists touches newest first with IN / OUT / N, template names and the reply badge', () => {
    render(<Timeline touches={mockTouches} templates={mockTemplates} today={today} />)
    expect(screen.getByText('3 touches')).toBeInTheDocument()
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings).toEqual(['Received · LinkedIn', 'Sent · LinkedIn', 'Sent · LinkedIn', 'Note'])

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('IN')
    expect(items[0]).toHaveTextContent('25 Oct, 16:42')
    expect(within(items[0]!).getByText('Reply received')).toBeInTheDocument()
    expect(within(items[1]!).getByText('Follow-up #1')).toBeInTheDocument()
    expect(items[2]).toHaveTextContent('OUT')
    expect(within(items[2]!).getByText('Opener A')).toBeInTheDocument()
    expect(items[3]).toHaveTextContent('N')
    expect(items[3]).toHaveTextContent('14 Oct')
  })

  it('has an empty state', () => {
    render(<Timeline touches={[]} today={today} />)
    expect(screen.getByText('0 touches')).toBeInTheDocument()
    expect(screen.getByText(/Log your first touch/)).toBeInTheDocument()
  })
})

describe('NotesCard', () => {
  it('shows labels bold, ticks to-dos and edits the list', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn<(notes: NoteDraft[]) => void>()
    render(<NotesCard notes={mockContactDetail.notes} onSave={onSave} />)

    expect(screen.getByText('Pain:').tagName).toBe('STRONG')
    expect(screen.getByRole('checkbox', { name: 'Send 2–3 examples' })).toBeChecked()

    await user.click(screen.getByRole('checkbox', { name: 'Prepare a mini audit of the booking page' }))
    const ticked = onSave.mock.calls[0]![0]
    expect(ticked[4]).toEqual({ id: mockContactDetail.notes[4]!.id, body: '[x] Prepare a mini audit of the booking page' })

    await user.click(screen.getByRole('button', { name: 'Edit notes' }))
    const box = screen.getByRole('textbox', { name: 'Notes' })
    expect(box).toHaveFocus()
    await user.type(box, '\n\nBudget: around €1,500')
    await user.click(screen.getByRole('button', { name: 'Save notes' }))
    const edited = onSave.mock.calls[1]![0]
    expect(edited).toHaveLength(6)
    expect(edited[0]!.id).toBe(mockContactDetail.notes[0]!.id)
    expect(edited[5]).toEqual({ body: 'Budget: around €1,500' })
    expect(await screen.findByRole('button', { name: 'Edit notes' })).toBeInTheDocument()
  })
})

describe('WonPanel', () => {
  it('pre-fills the deal value and this month, and saves', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn<(v: WonPanelValues) => void>()
    render(<WonPanel contact={mockContactDetail} today={today} onSave={onSave} />)

    expect(screen.getByLabelText('Amount (€)')).toHaveValue('1200')
    expect(screen.getByLabelText('Paid in')).toHaveDisplayValue('October')
    expect(screen.getByRole('checkbox', { name: 'Add to “Money earned”' })).toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Save deal' }))
    expect(onSave).toHaveBeenCalledWith({ amount: 1200, month: '2026-10', add_to_money_earned: true })
    expect(await screen.findByRole('status')).toHaveTextContent('Saved')
  })

  it('rejects an empty amount', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn<(v: WonPanelValues) => void>()
    render(<WonPanel contact={{ deal_value: null, won_amount: null, won_month: null }} today={today} onSave={onSave} />)
    await user.click(screen.getByRole('button', { name: 'Save deal' }))
    expect(await screen.findByText('Enter the amount')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })
})
