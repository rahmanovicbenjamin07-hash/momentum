import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Flame } from './Flame'

function part(container: HTMLElement, name: string) {
  return container.querySelector(`[data-part="${name}"]`)
}

describe('Flame', () => {
  it('paints the three layers and the circle in the level colours', () => {
    const { container } = render(<Flame level="flame" />)
    expect(part(container, 'outer')).toHaveAttribute('fill', '#F97316')
    expect(part(container, 'middle')).toHaveAttribute('fill', '#FB923C')
    expect(part(container, 'core')).toHaveAttribute('fill', '#FED7AA')
    expect(part(container, 'circle')).toHaveAttribute('fill', '#FFF7ED')
  })

  it('uses the size prop and defaults to 96px', () => {
    const { container, rerender } = render(<Flame level="spark" />)
    expect(container.querySelector('svg')).toHaveAttribute('width', '96')
    rerender(<Flame level="spark" size={40} />)
    expect(container.querySelector('svg')).toHaveAttribute('height', '40')
  })

  it('shows sparkles by level, and the prop overrides it', () => {
    const { container, rerender } = render(<Flame level="blaze" />)
    expect(part(container, 'sparkles')).toBeNull()
    rerender(<Flame level="legend" />)
    expect(part(container, 'sparkles')).not.toBeNull()
    rerender(<Flame level="legend" sparkles={false} />)
    expect(part(container, 'sparkles')).toBeNull()
    rerender(<Flame level="start" sparkles />)
    expect(part(container, 'sparkles')).not.toBeNull()
  })

  it('is hidden from screen readers unless it has a label', () => {
    const { container, rerender } = render(<Flame level="start" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    rerender(<Flame level="inferno" label="Inferno streak" />)
    expect(screen.getByRole('img', { name: 'Inferno streak' })).toBeInTheDocument()
  })
})

describe('Flame without circle', () => {
  it('drops the circle and sparkles and zooms in on the flame', () => {
    const { container } = render(<Flame level="legend" circle={false} size={20} />)
    expect(part(container, 'circle')).toBeNull()
    expect(part(container, 'sparkles')).toBeNull()
    expect(part(container, 'outer')).not.toBeNull()
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '20 20 60 60')
  })
})
