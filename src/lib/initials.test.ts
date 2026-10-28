import { describe, expect, it } from 'vitest'
import { getInitials } from './initials'

describe('getInitials', () => {
  it('uses first and last word of a name', () => {
    expect(getInitials('Benjamin Rahmanović')).toBe('BR')
    expect(getInitials('Emir Ali Kovač')).toBe('EK')
  })

  it('uses two letters of a single word', () => {
    expect(getInitials('amir')).toBe('AM')
  })

  it('uses the part before @ for emails', () => {
    expect(getInitials('lejla.hodzic@mail.com')).toBe('LH')
    expect(getInitials('bench@mail.com')).toBe('BE')
  })

  it('handles non-ASCII letters', () => {
    expect(getInitials('Šejla Žunić')).toBe('ŠŽ')
  })

  it('falls back to "?" for empty input', () => {
    expect(getInitials('')).toBe('?')
    expect(getInitials('   ')).toBe('?')
    expect(getInitials(null)).toBe('?')
    expect(getInitials(undefined)).toBe('?')
    expect(getInitials('@mail.com')).toBe('?')
  })
})
