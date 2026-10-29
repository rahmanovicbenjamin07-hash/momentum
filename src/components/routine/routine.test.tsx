import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MOCK_ROUTINE_MONTH, mockRoutineCards, mockWakeUpStats } from '@/mocks/routine'
import { daysText, rateTone } from './format'
import { MissReasonsBars } from './MissReasonsBars'
import { MonthTable } from './MonthTable'
import { RoutineChart, type RoutineChartMode } from './RoutineChart'
import { RoutineFacts } from './RoutineFacts'
import { RoutineItemCards } from './RoutineItemCards'

describe('routine format', () => {
  it('writes days and picks rate colours', () => {
    expect(daysText(1)).toBe('1 day')
    expect(daysText(182)).toBe('182 days')
    expect([1, 0.8, 0.61, 0.3, null].map(rateTone)).toEqual(['text-good', 'text-good', 'text-warn', 'text-bad', 'text-ink-2'])
  })
})

describe('RoutineItemCards', () => {
  it('shows each item with its days, rate and misses, and selects one', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn<(id: string) => void>()
    render(<RoutineItemCards items={mockRoutineCards} selectedId="r-wake" onSelect={onSelect} />)
    const wake = screen.getByRole('button', { name: /Wake up at 06:00/ })
    expect(wake).toHaveAttribute('aria-pressed', 'true')
    expect(wake).toHaveTextContent('Mon–Fri')
    expect(wake).toHaveTextContent('182 days')
    expect(within(wake).getByText('85% of scheduled days')).toHaveClass('text-good')
    expect(wake).toHaveTextContent('33 missed so far this year')
    expect(screen.getByRole('button', { name: /Morning workout/ })).toHaveTextContent('Mon, Wed, Fri')
    expect(within(screen.getByRole('button', { name: /Read 20 pages/ })).getByText('76% of scheduled days')).toHaveClass('text-warn')
    await user.click(screen.getByRole('button', { name: /Read 20 pages/ }))
    expect(onSelect).toHaveBeenCalledWith('r-read')
  })
})

function ChartHarness() {
  const [mode, setMode] = useState<RoutineChartMode>('running')
  const [show, setShow] = useState(true)
  return (
    <RoutineChart
      title="Wake up at 06:00 · Mon–Fri"
      year={2026}
      months={mockWakeUpStats.months}
      perfectLine={mockWakeUpStats.perfectLine}
      forecast={mockWakeUpStats.forecast?.line ?? null}
      mode={mode}
      onModeChange={setMode}
      showPerfect={show}
      onShowPerfectChange={setShow}
    />
  )
}

describe('RoutineChart', () => {
  it('shows this month, reads months with the keyboard, and switches mode and perfect year', async () => {
    const user = userEvent.setup()
    render(<ChartHarness />)
    const details = screen.getByText('October 2026').parentElement!
    expect(details).toHaveTextContent('20 of 20 days100% done · 0 missed · running total 182 days')

    const slider = screen.getByRole('slider', { name: /choose a month/ })
    slider.focus()
    await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}')
    expect(slider.getAttribute('aria-valuetext')).toBe('July 2026: 14 of 23 days, 61% done, 9 missed, running total 123 days')
    await user.keyboard('{End}')
    expect(slider.getAttribute('aria-valuetext')).toBe('December 2026: Still to come, forecast 221 days by then, perfect year 259 days')

    const legend = within(screen.getByRole('list', { name: 'Legend' }))
    expect(legend.getByText('Every scheduled day (perfect year)')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Show perfect year' }))
    expect(legend.queryByText('Every scheduled day (perfect year)')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Per month' }))
    expect(screen.getByText(/out of scheduled days, month by month/)).toBeInTheDocument()
    expect(legend.getByText('Scheduled days')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Show perfect year' })).not.toBeInTheDocument()

    const table = screen.getByRole('table', { name: /by month/ })
    expect(within(table).getByRole('row', { name: /^October/ })).toHaveTextContent('2020182215')
    expect(within(table).getByRole('row', { name: /^December/ })).toHaveTextContent('——forecast 221259')
  })
})

describe('RoutineFacts', () => {
  it('shows the six facts from the design', () => {
    render(<RoutineFacts stats={mockWakeUpStats} currentMonth={MOCK_ROUTINE_MONTH} />)
    expect(screen.getAllByRole('definition').map((d) => d.textContent)).toEqual([
      '182 days',
      'Out of 215 scheduled',
      '85%',
      '33 days missed',
      'Improving',
      'Based on monthly completion rate',
      'Oct · 100%',
      '20 of 20 days',
      '≈ 221 days',
      'Perfect year would be 259',
      '20 / 20',
      'October so far',
    ])
    expect(screen.getByText('Improving')).toHaveClass('text-good')
  })
})

describe('MissReasonsBars', () => {
  it('lists reasons with counts and the pattern sentence', () => {
    render(<MissReasonsBars reasons={mockWakeUpStats.missReasons} pattern={mockWakeUpStats.missWeekday?.sentence} />)
    expect(screen.getByText('Most misses are on Mondays — usually after a late Sunday.')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Tired15',
      'Sick4',
      'Travel4',
      'Other2',
      'Not answered8',
    ])
  })

  it('says when nothing was missed', () => {
    render(<MissReasonsBars reasons={[{ reason: 'Not answered', count: 0 }]} />)
    expect(screen.getByText(/No missed days/)).toBeInTheDocument()
  })
})

describe('MonthTable', () => {
  it('lists months newest first with coloured rates', () => {
    render(<MonthTable months={mockWakeUpStats.months} />)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(10)
    expect(rows[0]).toHaveTextContent('October20 of 20100%182 days0 days')
    expect(rows[1]).toHaveTextContent('September21 of 2295%162 days1 day')
    expect(within(rows[3]!).getByText('61%')).toHaveClass('text-warn')
    expect(rows[9]).toHaveTextContent('January16 of 2273%16 days6 days')
  })
})
