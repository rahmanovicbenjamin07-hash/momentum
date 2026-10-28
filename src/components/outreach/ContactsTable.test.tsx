import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { mockContacts } from '@/mocks/outreach'
import { ContactsTable } from './ContactsTable'

const today = '2026-10-28'

describe('ContactsTable', () => {
  it('shows one row per lead with all columns, and links to the lead', () => {
    render(
      <MemoryRouter>
        <ContactsTable contacts={mockContacts} today={today} />
      </MemoryRouter>,
    )
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(8)

    const emir = within(rows[0]!)
    expect(emir.getByRole('link', { name: 'Emir Kovač' })).toHaveAttribute('href', `/outreach/${mockContacts[0]!.id}`)
    expect(emir.getByText('Founder · Bloom Studio')).toBeInTheDocument()
    expect(emir.getByText('LinkedIn')).toBeInTheDocument()
    expect(emir.getByText('Replied')).toBeInTheDocument()
    expect(emir.getByText('LinkedIn message')).toBeInTheDocument()
    expect(emir.getByText('3 days ago')).toBeInTheDocument()
    expect(emir.getByText('Today')).toHaveClass('text-warn')
    expect(emir.getByText('€1,200')).toBeInTheDocument()

    expect(within(rows[1]!).getByText('1 day late')).toHaveClass('text-bad')
    expect(within(rows[7]!).getByText('Not yet')).toBeInTheDocument()
  })

  it('offers "Add lead" when there are no leads at all', async () => {
    const user = userEvent.setup()
    const onAddLead = vi.fn<() => void>()
    render(<ContactsTable contacts={[]} today={today} onAddLead={onAddLead} />)
    expect(screen.getByRole('heading', { name: 'No leads yet' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add lead' }))
    expect(onAddLead).toHaveBeenCalledOnce()
  })

  it('offers "Clear filters" when filters hide everything', async () => {
    const user = userEvent.setup()
    const onClearFilters = vi.fn<() => void>()
    render(<ContactsTable contacts={[]} today={today} filtered onClearFilters={onClearFilters} />)
    expect(screen.getByRole('heading', { name: 'No leads match' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onClearFilters).toHaveBeenCalledOnce()
  })
})
