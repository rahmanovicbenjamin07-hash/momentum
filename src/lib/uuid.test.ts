import { afterEach, describe, expect, it, vi } from 'vitest'
import { uuid } from './uuid'

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('uuid', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a v4 uuid', () => {
    expect(uuid()).toMatch(V4)
  })

  it('falls back to getRandomValues when randomUUID is missing (plain http)', () => {
    vi.spyOn(globalThis, 'crypto', 'get').mockReturnValue({
      getRandomValues: <T extends ArrayBufferView>(array: T) => {
        new Uint8Array(array.buffer).fill(0xff)
        return array
      },
    } as unknown as Crypto)
    expect(uuid()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff')
  })

  it('gives different values each call', () => {
    expect(uuid()).not.toBe(uuid())
  })
})
