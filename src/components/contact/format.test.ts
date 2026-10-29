import { describe, expect, it } from 'vitest'
import {
  followUpLabel,
  joinNotes,
  paidMonthOptions,
  parseNote,
  setNoteChecked,
  shortDay,
  splitNotes,
  tagLabel,
  touchWhen,
} from './format'

const today = '2026-10-28'

describe('contact format helpers', () => {
  it('shows short days with a year only outside this year', () => {
    expect(shortDay('2026-10-25', today)).toBe('25 Oct')
    expect(shortDay('2025-12-03', today)).toBe('3 Dec 2025')
  })

  it('shows touch times in Sarajevo time, across the DST change', () => {
    expect(touchWhen('2026-10-25T15:42:00+00:00', today)).toBe('25 Oct, 16:42')
    expect(touchWhen('2026-10-22T07:15:00+00:00', today)).toBe('22 Oct, 09:15')
  })

  it('labels follow-ups', () => {
    expect(followUpLabel('2026-10-28', today)).toEqual({ text: 'Today, 28 Oct', tone: 'warn' })
    expect(followUpLabel('2026-10-26', today)).toEqual({ text: '2 days late · 26 Oct', tone: 'bad' })
    expect(followUpLabel('2026-10-29', today)).toEqual({ text: 'Tomorrow, 29 Oct', tone: 'normal' })
    expect(followUpLabel('2026-10-30', today)).toEqual({ text: 'Fri, 30 Oct', tone: 'normal' })
    expect(followUpLabel(null, today)).toEqual({ text: '—', tone: 'none' })
  })

  it('labels tags', () => {
    expect(tagLabel('agency')).toBe('Agency')
    expect(tagLabel('no-website')).toBe('No website')
    expect(tagLabel('cold_lead')).toBe('Cold lead')
  })

  it('lists paid-in months newest first, year only when different', () => {
    const options = paidMonthOptions('2026-01-15')
    expect(options[0]).toEqual({ value: '2026-03', label: 'March' })
    expect(options.find((o) => o.value === '2026-01')?.label).toBe('January')
    expect(options.at(-1)).toEqual({ value: '2025-02', label: 'February 2025' })
    expect(options).toHaveLength(14)
  })

  it('parses labelled notes and checklist items', () => {
    expect(parseNote('Pain: booking page is slow')).toEqual({ kind: 'text', label: 'Pain', text: 'booking page is slow' })
    expect(parseNote('[x] Send 2–3 examples')).toEqual({ kind: 'check', done: true, text: 'Send 2–3 examples' })
    expect(parseNote('[ ] Prepare audit')).toEqual({ kind: 'check', done: false, text: 'Prepare audit' })
    expect(parseNote('https://example.com is their site')).toEqual({
      kind: 'text',
      label: null,
      text: 'https://example.com is their site',
    })
  })

  it('ticks a checklist note', () => {
    expect(setNoteChecked('[ ] Prepare audit', true)).toBe('[x] Prepare audit')
    expect(setNoteChecked('[x] Prepare audit', false)).toBe('[ ] Prepare audit')
    expect(setNoteChecked('Pain: slow', true)).toBe('Pain: slow')
  })

  it('splits the notes textarea into entries and back', () => {
    const text = 'Pain: slow page\non mobile\n\nAngle: case study\n\n[x] Send examples\n[ ] Prepare audit\n\n\n'
    const entries = splitNotes(text)
    expect(entries).toEqual(['Pain: slow page\non mobile', 'Angle: case study', '[x] Send examples', '[ ] Prepare audit'])
    expect(splitNotes(joinNotes(entries))).toEqual(entries)
  })
})
