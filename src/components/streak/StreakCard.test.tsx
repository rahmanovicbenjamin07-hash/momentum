import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StreakCard } from './StreakCard'
import { StreakMini } from './StreakMini'

describe('StreakCard', () => {
  it.each([
    [0, 'Start', 'Finish today’s routine to start one'],
    [5, 'Spark', '5 days to Flame'],
    [18, 'Flame', '12 days to Blaze'],
    [42, 'Blaze', '18 days to Inferno'],
    [75, 'Inferno', '25 days to Legend'],
    [120, 'Legend', 'Next milestone: 150 days'],
  ])('%i days → %s badge, "%s"', (days, levelName, caption) => {
    const { container } = render(<StreakCard days={days} />)
    expect(screen.getByText(levelName)).toBeInTheDocument()
    expect(screen.getByText(String(days))).toBeInTheDocument()
    expect(screen.getByText(caption)).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('data-level', levelName.toLowerCase())
  })

  it('fills the bar towards the next level', () => {
    render(<StreakCard days={5} />)
    // Spark runs 1 → 10, so 5 days is 4/9 of the way.
    expect(screen.getByRole('progressbar', { name: 'Progress to Flame' })).toHaveAttribute('aria-valuenow', '44')
  })

  it('says "day" for 1', () => {
    render(<StreakCard days={1} />)
    expect(screen.getByText('day')).toBeInTheDocument()
  })
})

describe('StreakMini', () => {
  it('shows days and is coloured by level', () => {
    const { container } = render(<StreakMini days={42} />)
    expect(screen.getByText('Current streak')).toBeInTheDocument()
    expect(screen.getByText('42 days')).toBeInTheDocument()
    expect(container.firstChild).toHaveAttribute('data-level', 'blaze')
  })
})
