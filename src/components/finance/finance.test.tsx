import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { totals, yearByMonth } from '@/lib/finance'
import { mockFinanceEntries } from '@/mocks/finance'
import type { FinanceEntry, FinanceEntryFormValues, StartingSavingsFormValues } from '@/schemas/finance'
import { FinanceEntriesList } from './FinanceEntriesList'
import { FinanceEntryForm } from './FinanceEntryForm'
import { FinanceSummary } from './FinanceSummary'
import { FinanceTabs } from './FinanceTabs'
import type { FinanceTab } from './meta'
import { FinanceYearCharts } from './FinanceYearCharts'
import { StartingSavingsCard } from './StartingSavingsCard'

const CATEGORIES = { income: ['Salary'], expense: ['Food', 'Rent'] }

// The app's dropdown (Radix Select) needs these browser bits that jsdom leaves out.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

describe('FinanceEntryForm', () => {
  it('adds a log on Enter, then clears it and keeps Earned/Spent and the day', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn<(v: FinanceEntryFormValues) => void>()
    render(<FinanceEntryForm onSubmit={onSubmit} categories={CATEGORIES} today="2026-11-02" />)

    await user.click(screen.getByRole('button', { name: 'Earned' }))
    await user.type(screen.getByLabelText('Name'), 'November salary')
    await user.click(screen.getByRole('combobox', { name: 'Currency' }))
    await user.click(await screen.findByRole('option', { name: 'KM' }))
    await user.type(screen.getByLabelText('Description (optional)'), 'Paid early')
    await user.type(screen.getByLabelText('Category (optional)'), 'Salary')
    await user.type(screen.getByLabelText('Amount'), '1.250,50{Enter}')

    expect(onSubmit).toHaveBeenCalledWith({
      kind: 'income',
      name: 'November salary',
      amount: 1250.5,
      currency: 'bam',
      category: 'Salary',
      date: '2026-11-02',
      note: 'Paid early',
    })
    expect(screen.getByLabelText('Name')).toHaveValue('')
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus())
    expect(screen.getByRole('button', { name: 'Earned' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('files a log without a category under Other', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn<(v: FinanceEntryFormValues) => void>()
    render(<FinanceEntryForm onSubmit={onSubmit} categories={CATEGORIES} today="2026-11-02" />)
    await user.type(screen.getByLabelText('Name'), 'Coffee')
    await user.type(screen.getByLabelText('Amount'), '2{Enter}')
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'expense', category: 'Other', note: null }))
  })

  it('explains what is wrong and does not submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn<(v: FinanceEntryFormValues) => void>()
    render(<FinanceEntryForm onSubmit={onSubmit} categories={CATEGORIES} today="2026-11-02" />)
    await user.type(screen.getByLabelText('Amount'), '5{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('Give it a name, e.g. Groceries')
    await user.type(screen.getByLabelText('Name'), 'Lunch')
    await user.clear(screen.getByLabelText('Amount'))
    await user.type(screen.getByLabelText('Amount'), 'lots{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a number, e.g. 1250 or 12.50')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps what you typed and shows the message when saving fails', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn<(v: FinanceEntryFormValues) => Promise<void>>().mockRejectedValue(new Error('Offline'))
    render(<FinanceEntryForm onSubmit={onSubmit} categories={CATEGORIES} today="2026-11-02" />)
    await user.type(screen.getByLabelText('Name'), 'Groceries')
    await user.type(screen.getByLabelText('Amount'), '12{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline')
    expect(screen.getByLabelText('Amount')).toHaveValue('12')
  })
})

describe('FinanceSummary', () => {
  it('shows the four totals, with profit signed', () => {
    render(<FinanceSummary monthLabel="November 2026" totals={{ earned: 2200, spent: 468.4, profit: 1731.6 }} saved={5000} />)
    expect(screen.getByText('€2,200')).toBeInTheDocument()
    expect(screen.getByText('€468.40')).toBeInTheDocument()
    expect(screen.getByText('+€1,731.60')).toBeInTheDocument()
    expect(screen.getByText('You kept 79% of what you earned')).toBeInTheDocument()
    expect(screen.getByText('€5,000')).toBeInTheDocument()
  })
})

describe('FinanceEntriesList', () => {
  const october = mockFinanceEntries.filter((e) => e.date.startsWith('2026-10'))

  it('is a Name | Description | Date | Total table headed by the month total; passes edit/delete up', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn<(e: FinanceEntry) => void>()
    const onDelete = vi.fn<(e: FinanceEntry) => void>()
    render(<FinanceEntriesList monthLabel="October 2026" totals={totals(october)} entries={october} onEdit={onEdit} onDelete={onDelete} />)

    const table = screen.getByRole('table', { name: 'Logs for October 2026' })
    const headers = within(table).getAllByRole('columnheader')
    expect(headers.map((h) => h.textContent)).toEqual(['Name', 'Description', 'Date', 'Total+€1,983.14', 'Edit or delete'])

    const [, bills, bloom] = within(table).getAllByRole('row')
    const billsCells = within(bills!).getAllByRole('cell')
    expect(billsCells[0]).toHaveTextContent('Electricity + internet')
    expect(billsCells[1]).toHaveTextContent('No description')
    expect(billsCells[2]).toHaveTextContent('28 Oct 2026')
    expect(billsCells[3]).toHaveTextContent('Spent −120 KM€61.36')
    const bloomCells = within(bloom!).getAllByRole('cell')
    expect(bloomCells[1]).toHaveTextContent('Second half of the invoice')
    expect(bloomCells[3]).toHaveTextContent('Earned +€650')

    await user.click(screen.getByRole('button', { name: 'Delete Bus pass on 10 Oct 2026' }))
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bus pass' }))
    await user.click(screen.getByRole('button', { name: 'Edit Concert on 5 Oct 2026' }))
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ note: 'Tickets for two' }))
  })

  it('says when the month is empty', () => {
    render(
      <FinanceEntriesList
        monthLabel="December 2026"
        totals={{ earned: 0, spent: 0, profit: 0 }}
        entries={[]}
        onEdit={vi.fn<(e: FinanceEntry) => void>()}
        onDelete={vi.fn<(e: FinanceEntry) => void>()}
      />,
    )
    expect(screen.getByText(/Nothing logged this month/)).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Total/ })).toHaveTextContent('Total€0')
  })
})

describe('FinanceTabs', () => {
  it('marks the open tab and moves with the arrow keys', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn<(t: FinanceTab) => void>()
    render(<FinanceTabs active="logs" onSelect={onSelect} />)
    expect(screen.getByRole('tab', { name: 'Logs' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: 'Yearly' }))
    expect(onSelect).toHaveBeenLastCalledWith('yearly')
    screen.getByRole('tab', { name: 'Logs' }).focus()
    await user.keyboard('{ArrowLeft}')
    expect(onSelect).toHaveBeenLastCalledWith('savings')
  })
})

describe('FinanceYearCharts', () => {
  it('has a month button per column and a table for screen readers; clicking opens that month', async () => {
    const user = userEvent.setup()
    const onSelectMonth = vi.fn<(m: string) => void>()
    const rows = yearByMonth(mockFinanceEntries, { amount_eur: 3000, date: '2026-08-01' }, 2026, '2026-11-02')
    render(<FinanceYearCharts year={2026} rows={rows} selectedMonth="2026-11" onSelectMonth={onSelectMonth} />)

    const october = screen.getByRole('button', { name: 'October 2026: earned €2,850, spent €866.86' })
    await user.click(october)
    expect(onSelectMonth).toHaveBeenCalledWith('2026-10')
    expect(screen.getByRole('button', { name: 'December 2026: still ahead' })).toBeInTheDocument()

    const table = screen.getByRole('table', { name: 'Money by month, 2026' })
    expect(within(table).getByRole('row', { name: /November 2026/ })).toHaveTextContent('€2,200€468.40€1,731.60')
  })
})

describe('StartingSavingsCard', () => {
  it('asks first, then shows the amount with a Change button', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn<(v: StartingSavingsFormValues) => void>()
    const { rerender } = render(<StartingSavingsCard current={null} today="2026-11-02" onSave={onSave} />)
    await user.type(screen.getByLabelText('Amount'), '3000')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith({ amount: 3000, currency: 'eur', date: '2026-11-02' })

    rerender(<StartingSavingsCard current={{ amount: 3000, currency: 'eur', date: '2026-11-02' }} today="2026-11-02" onSave={onSave} />)
    expect(screen.getByText('€3,000')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument()
  })
})
