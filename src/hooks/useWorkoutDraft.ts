import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Workout } from '@/lib/db'

export type SaveState = 'idle' | 'saving' | 'saved'

const SAVE_DELAY_MS = 400

/**
 * Edits apply instantly to a local copy and are written to IndexedDB shortly after.
 * Pending writes are flushed when the page is hidden (iOS may kill a backgrounded PWA) or on unmount.
 */
export function useWorkoutDraft(workoutId: string) {
  const stored = useLiveQuery(async () => (await db.workouts.get(workoutId)) ?? null, [workoutId])
  const [local, setLocal] = useState<Workout | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const latest = useRef<Workout | null>(null)
  const pending = useRef<Workout | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // A newer cloud copy (higher updatedAt) wins over the local one.
  const workout = local && local.id === workoutId && (!stored || local.updatedAt > stored.updatedAt) ? local : stored

  useEffect(() => {
    latest.current = workout ?? null
  })

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = undefined
    }
    const next = pending.current
    if (!next) return
    pending.current = null
    await db.workouts.put(next)
    if (!pending.current) setSaveState('saved')
  }, [])

  const change = useCallback(
    (fn: (w: Workout) => Workout) => {
      const base = latest.current
      if (!base) return
      const next = { ...fn(base), updatedAt: Math.max(Date.now(), base.updatedAt + 1) }
      latest.current = next
      pending.current = next
      setLocal(next)
      setSaveState('saving')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS)
    },
    [flush],
  )

  /** Drop unsaved edits, e.g. right before deleting the workout. */
  const discard = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = undefined
    pending.current = null
  }, [])

  useEffect(() => {
    const onPageHide = () => void flush()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibility)
      void flush()
    }
  }, [flush])

  return { workout, change, saveState, flush, discard }
}
