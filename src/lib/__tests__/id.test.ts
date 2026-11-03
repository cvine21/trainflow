import { describe, expect, it, vi } from 'vitest'
import { uid } from '@/lib/id'

describe('uid', () => {
  it('returns a UUID in a secure context', () => {
    vi.stubGlobal('isSecureContext', true)
    const id = uid()
    expect(id).toMatch(/^[0-9a-f-]{36}$/i)
    vi.unstubAllGlobals()
  })

  it('falls back to hex when not secure', () => {
    vi.stubGlobal('isSecureContext', false)
    const id = uid()
    expect(id).toMatch(/^[0-9a-f]{32}$/i)
    vi.unstubAllGlobals()
  })
})
