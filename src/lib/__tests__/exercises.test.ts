import { describe, expect, it } from 'vitest'
import type { Exercise } from '@/lib/db'
import { findExact, findSimilar } from '@/lib/exercises'

const lib: Exercise[] = [
  { id: '1', name: 'Жим лёжа', category: 'Грудь', metrics: ['reps', 'weight'], createdAt: 1, updatedAt: 1 },
  { id: '2', name: 'Жим гантелей стоя', category: 'Плечи', metrics: ['reps', 'weight'], createdAt: 1, updatedAt: 1 },
  { id: '3', name: 'Подтягивания', category: 'Спина', metrics: ['reps', 'band'], createdAt: 1, updatedAt: 1 },
  { id: '4', name: 'Тяга верхнего блока', category: 'Спина', metrics: ['reps', 'weight'], createdAt: 1, updatedAt: 1 },
]

describe('findExact', () => {
  it('matches ignoring case and ё', () => {
    expect(findExact('жим лежа', lib)?.id).toBe('1')
    expect(findExact('Жим лёжа!', lib)?.id).toBe('1')
    expect(findExact('нет такого', lib)).toBeUndefined()
  })
})

describe('findSimilar', () => {
  it('returns nothing for short queries', () => {
    expect(findSimilar('жи', lib)).toEqual([])
  })

  it('finds typos and excludes the exact match', () => {
    const similar = findSimilar('Подтягиваниа', lib)
    expect(similar.map((e) => e.id)).toContain('3')
    expect(findSimilar('Подтягивания', lib).map((e) => e.id)).not.toContain('3')
  })

  it('suggests prefix variants', () => {
    const similar = findSimilar('Подтягиван', lib)
    expect(similar.map((e) => e.id)).toContain('3')
  })
})
