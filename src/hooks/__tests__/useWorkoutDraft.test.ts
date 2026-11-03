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

  it('keeps edits local and autosaves after a short delay', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useWorkoutDraft('w1'))

    act(() => {
      result.current.change((w) => ({ ...w, title: 'Силовая' }))
    })
    expect(result.current.workout?.title).toBe('Силовая')
    expect(result.current.saveState).toBe('saving')
    expect(put).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(put).toHaveBeenCalled()
    expect(result.current.saveState).toBe('saved')
    vi.useRealTimers()
  })

  it('discard cancels a pending write', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useWorkoutDraft('w1'))
    act(() => {
      result.current.change((w) => ({ ...w, title: 'Черновик' }))
    })
    act(() => {
      result.current.discard()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(put).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('flush writes immediately', async () => {
    const { result } = renderHook(() => useWorkoutDraft('w1'))
    act(() => {
      result.current.change((w) => ({ ...w, notes: 'пауза' }))
    })
    await act(async () => {
      await result.current.flush()
    })
    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(put.mock.calls.at(-1)?.[0]).toMatchObject({ notes: 'пауза', id: 'w1' })
  })
})
