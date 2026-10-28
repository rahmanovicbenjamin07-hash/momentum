import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { todayProgress } from '@/lib/progress'
import { mockTodayItems } from '@/mocks/today'
import { OutreachWeekCard } from './OutreachWeekCard'
import { ProgressCard } from './ProgressCard'

describe('ProgressCard', () => {
  it('shows the design numbers', () => {
    render(<ProgressCard progress={todayProgress(mockTodayItems)} />)
    expect(screen.getByText('45%')).toBeInTheDocument()
    expect(screen.getByText('5 of 11 done')).toBeInTheDocument()
    expect(screen.getByText('Repeating 3/5 · One-off 2/6')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Today’s progress' })).toHaveAttribute('aria-valuenow', '45')
  })

  it('handles an empty day', () => {
    render(<ProgressCard progress={todayProgress([])} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('nothing planned yet')).toBeInTheDocument()
  })
})

describe('OutreachWeekCard', () => {
  it('shows sent of goal and the caption', () => {
    render(<OutreachWeekCard sent={11} goal={20} replies={3} />)
    expect(screen.getByText('11')).toBeInTheDocument()
    expect(screen.getByText('of 20 goal')).toBeInTheDocument()
    expect(screen.getByText('3 replies so far · 9 more to hit your goal')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '55')
  })

  it('defaults the goal to 20 and works with zero (before Phase 2)', () => {
    render(<OutreachWeekCard sent={0} replies={0} />)
    expect(screen.getByText('of 20 goal')).toBeInTheDocument()
    expect(screen.getByText('No replies yet · 20 more to hit your goal')).toBeInTheDocument()
  })
})
