import { describe, expect, it } from 'vitest'
import { keepRangeValid } from './routine'

const classes = { end_time: '11:00:00' }

describe('keepRangeValid', () => {
  it('keeps the end when the new start is still before it', () => {
    expect(keepRangeValid({ id: 'a', time: '08:30' }, classes)).toEqual({ id: 'a', time: '08:30' })
  })

  it('drops the end when the start is cleared or moved to / past it', () => {
    expect(keepRangeValid({ id: 'a', time: null }, classes)).toEqual({ id: 'a', time: null, endTime: null })
    expect(keepRangeValid({ id: 'a', time: '11:00' }, classes)).toEqual({ id: 'a', time: '11:00', endTime: null })
    expect(keepRangeValid({ id: 'a', time: '12:15' }, classes)).toEqual({ id: 'a', time: '12:15', endTime: null })
  })

  it('leaves other changes alone (no time change, an explicit end, or no end saved)', () => {
    expect(keepRangeValid({ id: 'a', days: [true, true, true, true, true, false, false] }, classes)).not.toHaveProperty('endTime')
    expect(keepRangeValid({ id: 'a', time: '12:00', endTime: '13:00' }, classes)).toEqual({ id: 'a', time: '12:00', endTime: '13:00' })
    expect(keepRangeValid({ id: 'a', time: null }, { end_time: null })).toEqual({ id: 'a', time: null })
    expect(keepRangeValid({ id: 'a', time: null }, undefined)).toEqual({ id: 'a', time: null })
  })
})
