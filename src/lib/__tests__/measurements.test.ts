import { describe, expect, it } from 'vitest'
import { hasValues, MEASUREMENT_FIELDS } from '@/lib/measurements'

describe('measurements', () => {
  it('lists the eight body fields', () => {
    expect(MEASUREMENT_FIELDS).toHaveLength(8)
    expect(MEASUREMENT_FIELDS.map((f) => f.key)).toContain('weightKg')
    expect(MEASUREMENT_FIELDS.map((f) => f.key)).toContain('heightCm')
  })

  it('detects whether any field is filled', () => {
    expect(hasValues({})).toBe(false)
    expect(hasValues({ waistCm: null })).toBe(false)
    expect(hasValues({ weightKg: 70 })).toBe(true)
  })
})
