import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { mockWeekProgress } from '@/mocks/today'
import { ThisWeekCard } from './ThisWeekCard'

function setup() {
  render(
    <MemoryRouter>
      <ThisWeekCard week={mockWeekProgress} outreach={{ sent: 11, goal: 20 }} />
    </MemoryRouter>,
  )
}

describe('ThisWeekCard', () => {
  it('shows the week percent, range and counts', () => {
    setup()
    expect(screen.getByText('76%')).toBeInTheDocument()
    expect(screen.getByText('Week progress · Mon–Wed')).toBeInTheDocument()
    expect(screen.getByText('17/24')).toBeInTheDocument()
    expect(screen.getByText('12/14')).toBeInTheDocument()
    expect(screen.getByText('11/20')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Stats' })).toHaveAttribute('href', '/stats')
  })

  it('has a 7-day strip that screen readers can read', () => {
    setup()
    const days = within(screen.getByRole('list', { name: 'Days this week' })).getAllByRole('listitem')
    expect(days).toHaveLength(7)
    expect(days[0]).toHaveTextContent('Monday: 86% done')
    expect(days[2]).toHaveTextContent('Wednesday (today): 45% done')
    expect(days[3]).toHaveTextContent('Thursday: not yet')
  })
})
