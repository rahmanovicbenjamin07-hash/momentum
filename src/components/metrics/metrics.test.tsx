import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  MOCK_CURRENT_MONTH,
  mockExisting,
  mockLogMonths,
  mockMetricCards,
  mockMoneyFacts,
  mockMoneyForecast,
  mockMoneyLastYear,
  mockMoneyMonths,
} from '@/mocks/metrics'
import type { LogValueFormValues, NewMetricFormValues } from '@/schemas/stats'
import { EntriesTable } from './EntriesTable'
import { LogValueForm } from './LogValueForm'
import { MetricCards } from './MetricCards'
import { MetricChart, type MetricChartMode } from './MetricChart'
import { MetricFacts } from './MetricFacts'
import { NewMetricDialog } from './NewMetricDialog'

describe('MetricCards', () => {
  it('shows each metric with its change and goal, and selects or adds one', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn<(id: string) => void>()
    const onNew = vi.fn<() => void>()
    render(<MetricCards metrics={mockMetricCards} selectedId="m-money" onSelect={onSelect} onNew={onNew} />)
    const money = screen.getByRole('button', { name: /Money earned/ })
    expect(money).toHaveAttribute('aria-pressed', 'true')
    expect(money).toHaveTextContent('Monthly')
    expect(money).toHaveTextContent('€13,950')
    expect(money).toHaveTextContent('+71% vs same time 2025')
    expect(money).toHaveTextContent('78% of €18,000 goal')
    expect(screen.getByRole('button', { name: /Hours worked/ })).toHaveTextContent('1,371 h')
    await user.click(screen.getByRole('button', { name: /Trainings/ }))
    expect(onSelect).toHaveBeenCalledWith('m-trainings')
    await user.click(screen.getByRole('button', { name: /New metric/ }))
    expect(onNew).toHaveBeenCalledOnce()
  })
})

function ChartHarness() {
  const [mode, setMode] = useState<MetricChartMode>('running')
  const [compare, setCompare] = useState(true)
  return (
    <MetricChart
      name="Money earned"
      year={2026}
      unit="eur"
      months={mockMoneyMonths}
      lastYear={mockMoneyLastYear}
      forecast={mockMoneyForecast}
      goal={18000}
      mode={mode}
      onModeChange={setMode}
      compare={compare}
      onCompareChange={setCompare}
    />
  )
}

describe('MetricChart', () => {
  it('shows the latest month’s details, reads months with the keyboard and switches mode', async () => {
    const user = userEvent.setup()
    render(<ChartHarness />)
    expect(screen.getByRole('heading', { name: 'Money earned · 2026' })).toBeInTheDocument()
    const details = screen.getByText('October 2026').parentElement!
    expect(details).toHaveTextContent('€13,950 so far')
    expect(details).toHaveTextContent('€2,200 this month · +13% vs Sep · 2025: €1,050 · “2 new clients”')

    const slider = screen.getByRole('slider', { name: 'Money earned 2026, choose a month' })
    slider.focus()
    await user.keyboard('{ArrowLeft}')
    expect(slider).toHaveAttribute('aria-valuenow', '9')
    expect(slider.getAttribute('aria-valuetext')).toMatch(/^September 2026: €11,750 so far, €1,950 this month, \+16% vs Aug/)
    await user.keyboard('{End}')
    expect(slider.getAttribute('aria-valuetext')).toMatch(/^December 2026: Not logged yet, forecast €17,837/)

    const legend = within(screen.getByRole('list', { name: 'Legend' }))
    expect(legend.getByText('Forecast at your recent pace')).toBeInTheDocument()
    expect(legend.getByText('2025, same month')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Compare with 2025' }))
    expect(legend.queryByText('2025, same month')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Per month' }))
    expect(screen.getByRole('button', { name: 'Per month' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Per month — each bar/)).toBeInTheDocument()
    expect(legend.getByText('Goal pace')).toBeInTheDocument()

    const table = screen.getByRole('table', { name: 'Money earned 2026, by month' })
    expect(within(table).getByRole('row', { name: /October/ })).toHaveTextContent('€2,200€13,950€1,050')
    expect(within(table).getByRole('row', { name: /November/ })).toHaveTextContent('not loggedforecast')
  })
})

describe('MetricFacts', () => {
  it('shows the six facts from the design', () => {
    render(<MetricFacts facts={mockMoneyFacts} />)
    const values = screen.getAllByRole('definition').map((d) => d.textContent)
    expect(values).toEqual([
      '€13,950',
      '10 months logged',
      '+71%',
      '2025 had €8,150',
      '+11%',
      'From Jan to Oct',
      'Accelerating',
      'Growing faster in recent months',
      'Oct · €2,200',
      '2 new clients',
      '≈ €17,837',
      '99% of the €18,000 goal',
    ])
    expect(screen.getByText('≈ €17,837')).toHaveClass('text-warn')
    expect(screen.getByText('+71%')).toHaveClass('text-good')
  })
})

describe('LogValueForm', () => {
  it('saves a new month, and fills in a logged month to replace it', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn<(v: LogValueFormValues) => void>()
    render(<LogValueForm unit="eur" months={mockLogMonths} defaultMonth={MOCK_CURRENT_MONTH} existing={mockExisting} onSubmit={onSubmit} />)
    expect(screen.getByLabelText('Month')).toHaveDisplayValue('October')

    await user.click(screen.getByRole('button', { name: 'Save entry' }))
    expect(await screen.findByText('Enter a value')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Amount (€) for the month'), '2200')
    await user.type(screen.getByLabelText('Note (optional)'), '2 new clients')
    await user.click(screen.getByRole('button', { name: 'Save entry' }))
    expect(onSubmit).toHaveBeenCalledWith({ month: '2026-10', value: 2200, note: '2 new clients' })

    await user.selectOptions(screen.getByLabelText('Month'), 'August')
    expect(screen.getByLabelText('Amount (€) for the month')).toHaveValue('1680')
    expect(screen.getByLabelText('Note (optional)')).toHaveValue('Fitbox Gym project')
    expect(screen.getByRole('button', { name: 'Update entry' })).toBeInTheDocument()
    expect(screen.getByText(/August already has a value/)).toBeInTheDocument()
  })
})

describe('NewMetricDialog', () => {
  it('needs a name, then creates the metric', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn<(v: NewMetricFormValues) => void>()
    render(<NewMetricDialog open onOpenChange={() => {}} onSubmit={onSubmit} />)
    const dialog = within(screen.getByRole('dialog', { name: 'New metric' }))

    await user.click(dialog.getByRole('button', { name: 'Create metric' }))
    expect(await dialog.findByText('Name the metric')).toBeInTheDocument()

    await user.type(dialog.getByLabelText('Name'), 'Books read')
    await user.click(dialog.getByRole('radio', { name: 'Weekly' }))
    await user.type(dialog.getByLabelText('Yearly goal (optional)'), '24')
    await user.click(dialog.getByRole('button', { name: 'Create metric' }))
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Books read', unit: 'count', log_every: 'weekly', yearly_goal: 24 })
  })
})

describe('EntriesTable', () => {
  it('lists months newest first with change and running total', () => {
    render(<EntriesTable rows={mockMoneyMonths} unit="eur" />)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(10)
    expect(rows[0]).toHaveTextContent('October€2,200+13%€13,9502 new clients')
    expect(rows[3]).toHaveTextContent('July€1,420−5.3%€8,120')
    expect(within(rows[3]!).getByText('−5.3%')).toHaveClass('text-bad')
    expect(rows[9]).toHaveTextContent('January€850—No month before€850')
  })
})
