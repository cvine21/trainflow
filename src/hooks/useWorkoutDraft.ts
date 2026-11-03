import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Workout } from '@/lib/db'

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved'

/**
 * Edits apply instantly to a local copy. Persisted only when `save()` is called.
 */
export function useWorkoutDraft(workoutId: string) {
  const stored = useLiveQuery(async () => (await db.workouts.get(workoutId)) ?? null, [workoutId])
  const [local, setLocal] = useState<Workout | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const latest = useRef<Workout | null>(null)
  const pending = useRef<Workout | null>(null)

  // A newer cloud copy (higher updatedAt) wins over the local one.
  const workout = local && local.id === workoutId && (!stored || local.updatedAt > stored.updatedAt) ? local : stored

  useEffect(() => {
    latest.current = workout ?? null
  })

  const save = useCallback(async () => {
    const next = pending.current
    if (!next) return
    setSaveState('saving')
    pending.current = null
    await db.workouts.put(next)
    if (!pending.current) setSaveState('saved')
  }, [])

  const change = useCallback((fn: (w: Workout) => Workout) => {
    const base = latest.current
    if (!base) return
    const next = { ...fn(base), updatedAt: Math.max(Date.now(), base.updatedAt + 1) }
    latest.current = next
    pending.current = next
    setLocal(next)
    setSaveState('dirty')
  }, [])

  /** Drop unsaved edits, e.g. right before deleting the workout. */
  const discard = useCallback(() => {
    pending.current = null
    setLocal(null)
    setSaveState('idle')
  }, [])

  return {
    workout,
    change,
    save,
    discard,
    saveState,
    dirty: saveState === 'dirty' || saveState === 'saving',
  }
}
