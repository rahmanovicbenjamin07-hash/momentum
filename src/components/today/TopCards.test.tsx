import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { todayProgress } from '@/lib/progress'
import { mockTodayItems } from '@/mocks/today'
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
