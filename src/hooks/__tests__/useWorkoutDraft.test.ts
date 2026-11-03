import type { Workout } from '@/lib/db'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const put = vi.fn(async (..._args: unknown[]) => undefined)
const get = vi.fn<(...args: unknown[]) => Workout | null | undefined>()

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (fn: () => unknown) => {
    void fn
    return get()
  },
}))

vi.mock('@/lib/db', () => ({
  db: {
    workouts: {
      get: (...args: unknown[]) => get(...args),
      put: (...args: unknown[]) => put(...args),
    },
  },
}))

import { useWorkoutDraft } from '@/hooks/useWorkoutDraft'

const base: Workout = {
  id: 'w1',
  clientId: 'c1',
  title: 'План',
  date: '2026-11-01',
  time: '',
  status: 'planned',
  blocks: [],
  notes: '',
  createdAt: 1,
  updatedAt: 100,
}

describe('useWorkoutDraft', () => {
  beforeEach(() => {
    put.mockClear()
    get.mockReset()
    get.mockReturnValue(base)
  })

  it('keeps edits local until save is called', async () => {
    const { result } = renderHook(() => useWorkoutDraft('w1'))

    act(() => {
      result.current.change((w) => ({ ...w, title: 'Силовая' }))
    })
    expect(result.current.workout?.title).toBe('Силовая')
    expect(result.current.dirty).toBe(true)
    expect(result.current.saveState).toBe('dirty')
    expect(put).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.save()
    })
    expect(put).toHaveBeenCalled()
    expect(result.current.saveState).toBe('saved')
    expect(result.current.dirty).toBe(false)
  })

  it('discard drops unsaved edits without writing', async () => {
    const { result } = renderHook(() => useWorkoutDraft('w1'))
    act(() => {
      result.current.change((w) => ({ ...w, title: 'Черновик' }))
    })
    act(() => {
      result.current.discard()
    })
    expect(put).not.toHaveBeenCalled()
    expect(result.current.dirty).toBe(false)
    expect(result.current.workout?.title).toBe('План')
  })

  it('save writes the latest pending workout', async () => {
    const { result } = renderHook(() => useWorkoutDraft('w1'))
    act(() => {
      result.current.change((w) => ({ ...w, notes: 'пауза' }))
    })
    await act(async () => {
      await result.current.save()
    })
    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(put.mock.calls.at(-1)?.[0]).toMatchObject({ notes: 'пауза', id: 'w1' })
  })
})
