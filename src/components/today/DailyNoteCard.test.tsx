import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DailyNoteCard } from './DailyNoteCard'

function setup(energy: number | null = null) {
  const onSaveNote = vi.fn<(note: string) => void>()
  const onEnergyChange = vi.fn<(energy: number | null) => void>()
  const view = render(<DailyNoteCard note="" energy={energy} onSaveNote={onSaveNote} onEnergyChange={onEnergyChange} />)
  return { onSaveNote, onEnergyChange, note: screen.getByRole('textbox', { name: 'Daily note' }), ...view }
}

describe('DailyNoteCard autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('saves 800 ms after typing stops, once', () => {
    const { onSaveNote, note } = setup()
    fireEvent.change(note, { target: { value: 'Good' } })
    act(() => vi.advanceTimersByTime(500))
    fireEvent.change(note, { target: { value: 'Good focus' } })
    act(() => vi.advanceTimersByTime(799))
    expect(onSaveNote).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onSaveNote).toHaveBeenCalledOnce()
    expect(onSaveNote).toHaveBeenCalledWith('Good focus')
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('saves right away on blur, and not again after', () => {
    const { onSaveNote, note } = setup()
    fireEvent.change(note, { target: { value: 'Tired' } })
    fireEvent.blur(note)
    expect(onSaveNote).toHaveBeenCalledWith('Tired')
    act(() => vi.advanceTimersByTime(2000))
    expect(onSaveNote).toHaveBeenCalledOnce()
  })

  it('saves a pending note when the card closes', () => {
    const { onSaveNote, note, unmount } = setup()
    fireEvent.change(note, { target: { value: 'Half way' } })
    unmount()
    expect(onSaveNote).toHaveBeenCalledWith('Half way')
  })
})

describe('DailyNoteCard energy', () => {
  it('picks a level and clears it when clicked again', () => {
    const { onEnergyChange, rerender, onSaveNote } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Energy 4 of 5' }))
    expect(onEnergyChange).toHaveBeenLastCalledWith(4)

    rerender(<DailyNoteCard note="" energy={4} onSaveNote={onSaveNote} onEnergyChange={onEnergyChange} />)
    const four = screen.getByRole('button', { name: 'Energy 4 of 5' })
    expect(four).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(four)
    expect(onEnergyChange).toHaveBeenLastCalledWith(null)
  })
})
