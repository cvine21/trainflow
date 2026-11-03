import { describe, expect, it } from 'vitest'
import type { WorkoutExercise, WorkoutSet } from '@/lib/db'
import {
  blockDefaults,
  blockTitle,
  emomIntervals,
  estimateOneRepMax,
  formatBlockResult,
  formatBestSet,
  formatSet,
  formatSetGroup,
  groupSets,
  isBodyweight,
  isCircuit,
  loadOf,
  newBlock,
  newExercise,
  sortMetrics,
  summarizeSets,
  withLoad,
} from '@/lib/workouts'

const set = (partial: Partial<WorkoutSet> & { id: string }): WorkoutSet => ({
  reps: null,
  weight: null,
  band: null,
  timeSec: null,
  distance: null,
  calories: null,
  ...partial,
})

describe('metrics helpers', () => {
  it('sorts metrics in display order', () => {
    expect(sortMetrics(['calories', 'reps', 'weight'])).toEqual(['reps', 'weight', 'calories'])
  })

  it('derives and applies load type', () => {
    expect(loadOf(['reps', 'weight'])).toBe('kg')
    expect(loadOf(['reps', 'band'])).toBe('band')
    expect(loadOf(['reps'])).toBe('bodyweight')
    expect(withLoad(['reps', 'time'], 'kg')).toEqual(['reps', 'weight', 'time'])
    expect(withLoad(['reps', 'weight'], 'bodyweight')).toEqual(['reps'])
    expect(isBodyweight(['reps'])).toBe(true)
    expect(isBodyweight(['reps', 'weight'])).toBe(false)
  })
})

describe('set formatting and grouping', () => {
  const metrics = ['reps', 'weight'] as const

  it('formats a single set', () => {
    expect(formatSet(set({ id: '1', reps: 10, weight: 36 }), [...metrics])).toBe('10 повт. · 36 кг')
    expect(formatSet(set({ id: '1' }), [...metrics])).toBe('—')
  })

  it('groups consecutive equal sets', () => {
    const sets = [
      set({ id: 'a', reps: 10, weight: 36 }),
      set({ id: 'b', reps: 10, weight: 36 }),
      set({ id: 'c', reps: 8, weight: 36 }),
    ]
    const groups = groupSets(sets, [...metrics])
    expect(groups).toHaveLength(2)
    expect(formatSetGroup(groups[0]!, [...metrics])).toBe('2 × 10 повт. · 36 кг')
    expect(formatSetGroup(groups[1]!, [...metrics])).toBe('8 повт. · 36 кг')
  })

  it('keeps apart ids from merging', () => {
    const sets = [set({ id: 'a', reps: 10 }), set({ id: 'b', reps: 10 })]
    expect(groupSets(sets, ['reps'], ['a'])).toHaveLength(2)
  })

  it('summarizes identical sets compactly', () => {
    const ex: WorkoutExercise = {
      ...newExercise({ name: 'Жим', metrics: ['reps', 'weight'] }, [
        set({ id: '1', reps: 10, weight: 40 }),
        set({ id: '2', reps: 10, weight: 40 }),
        set({ id: '3', reps: 10, weight: 40 }),
      ]),
    }
    expect(summarizeSets(ex)).toBe('3×10 · 40 кг')
  })
})

describe('blocks', () => {
  it('detects circuit formats and defaults', () => {
    expect(isCircuit('amrap')).toBe(true)
    expect(isCircuit('sets')).toBe(false)
    expect(blockDefaults('emom')).toEqual({ rounds: null, durationSec: 600, intervalSec: 60 })
    expect(blockDefaults('rounds').rounds).toBe(3)
  })

  it('builds titles and EMOM interval counts', () => {
    expect(blockTitle(newBlock('superset'))).toBe('Суперсет')
    expect(blockTitle({ format: 'rounds', rounds: 3, durationSec: null, intervalSec: null })).toBe('3 раунда')
    expect(blockTitle({ format: 'emom', rounds: null, durationSec: 600, intervalSec: 60 })).toBe('EMOM 10 мин')
    expect(emomIntervals({ durationSec: 600, intervalSec: 60 })).toBe(10)
    expect(emomIntervals({ durationSec: null, intervalSec: 60 })).toBeNull()
  })

  it('formats AMRAP / EMOM results', () => {
    expect(
      formatBlockResult({
        ...newBlock('amrap'),
        result: { rounds: 8, reps: 12, timeSec: null, note: 'тяжело' },
      }),
    ).toBe('8 раундов + 12 повт. · тяжело')

    expect(
      formatBlockResult({
        ...newBlock('emom'),
        result: { rounds: 8, reps: null, timeSec: null },
      }),
    ).toBe('8 из 10')
  })
})

describe('strength helpers', () => {
  it('estimates 1RM with Epley', () => {
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(100 * (1 + 5 / 30))
    expect(estimateOneRepMax(100, 1)).toBe(100)
    expect(estimateOneRepMax(100, 0)).toBeNull()
    expect(estimateOneRepMax(100, 13)).toBeNull()
  })

  it('formats best set with load first', () => {
    expect(formatBestSet(set({ id: '1', reps: 5, weight: 100 }), ['reps', 'weight'])).toBe('100 кг × 5')
  })
})
