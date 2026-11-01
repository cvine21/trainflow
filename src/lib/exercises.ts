import { addTombstone, db, type Exercise, type Metric, type Workout } from '@/lib/db'
import { normalizeName } from '@/lib/format'
import { uid } from '@/lib/id'
import { sortMetrics } from '@/lib/workouts'

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost)
    }
    prev = cur
  }
  return prev[b.length]!
}

export function findExact(query: string, library: Exercise[]): Exercise | undefined {
  const q = normalizeName(query)
  return q ? library.find((e) => normalizeName(e.name) === q) : undefined
}

/** Library entries that look like a typo or variant of the query (exact match excluded). */
export function findSimilar(query: string, library: Exercise[], limit = 3): Exercise[] {
  const q = normalizeName(query)
  if (q.length < 3) return []
  const scored: Array<[Exercise, number]> = []
  for (const e of library) {
    const n = normalizeName(e.name)
    if (n === q) continue
    const dist = levenshtein(q, n)
    const maxDist = q.length >= 8 ? 3 : 2
    if (dist <= maxDist) scored.push([e, dist])
    else if (q.length >= 4 && (n.startsWith(q) || q.startsWith(n))) scored.push([e, maxDist + 1])
  }
  return scored
    .sort((a, b) => a[1] - b[1] || a[0].name.localeCompare(b[0].name))
    .slice(0, limit)
    .map(([e]) => e)
}

export async function createExercise(name: string, category: string, metrics: Metric[]): Promise<Exercise> {
  const now = Date.now()
  const exercise: Exercise = {
    id: uid(),
    name: name.trim(),
    category,
    metrics: sortMetrics(metrics),
    createdAt: now,
    updatedAt: now,
  }
  await db.exercises.add(exercise)
  return exercise
}

function rewriteWorkouts(
  workouts: Workout[],
  fn: (exerciseId: string | undefined) => Partial<{ exerciseId: string; name: string }> | null,
) {
  const now = Date.now()
  const changed: Workout[] = []
  for (const w of workouts) {
    let touched = false
    const blocks = w.blocks.map((b) => ({
      ...b,
      exercises: b.exercises.map((ex) => {
        const patch = fn(ex.exerciseId)
        if (!patch) return ex
        touched = true
        return { ...ex, ...patch }
      }),
    }))
    if (touched) changed.push({ ...w, blocks, updatedAt: now })
  }
  return changed
}

/** Saves library changes; a rename is propagated into every workout that references the exercise. */
export async function updateExercise(id: string, patch: { name: string; category: string; metrics: Metric[] }) {
  const name = patch.name.trim()
  await db.transaction('rw', db.exercises, db.workouts, async () => {
    const before = await db.exercises.get(id)
    await db.exercises.update(id, {
      name,
      category: patch.category,
      metrics: sortMetrics(patch.metrics),
      updatedAt: Date.now(),
    })
    if (!before || before.name === name) return
    const changed = rewriteWorkouts(await db.workouts.toArray(), (exId) => (exId === id ? { name } : null))
    if (changed.length) await db.workouts.bulkPut(changed)
  })
}

/** Re-points every workout from the duplicate to the target and removes the duplicate. */
export async function mergeExercises(sourceId: string, targetId: string): Promise<number> {
  if (sourceId === targetId) return 0
  let count = 0
  await db.transaction('rw', db.exercises, db.workouts, db.tombstones, async () => {
    const target = await db.exercises.get(targetId)
    if (!target) throw new Error('Упражнение не найдено')
    const changed = rewriteWorkouts(await db.workouts.toArray(), (exId) =>
      exId === sourceId ? { exerciseId: target.id, name: target.name } : null,
    )
    if (changed.length) await db.workouts.bulkPut(changed)
    count = changed.length
    await addTombstone(sourceId, 'exercises')
    await db.exercises.delete(sourceId)
  })
  return count
}
