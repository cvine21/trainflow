import { db, legacyBlocks, type Workout } from '@/lib/db'
import { normalizeName, toISODate } from '@/lib/format'
import { uid } from '@/lib/id'

/** Links workout exercises to library ids by name; repairs ids that point to a replaced library entry. */
async function linkExercises() {
  const library = await db.exercises.toArray()
  const ids = new Set(library.map((e) => e.id))
  const byName = new Map(library.map((e) => [normalizeName(e.name), e.id]))
  const now = Date.now()
  const changed: Workout[] = []
  for (const raw of await db.workouts.toArray()) {
    const w = raw as Workout & { exercises?: unknown }
    let touched = false
    let blocks = w.blocks
    if (!Array.isArray(blocks)) {
      blocks = legacyBlocks(w.exercises)
      touched = true
    }
    blocks = blocks.map((b) => ({
      ...b,
      exercises: b.exercises.map((ex) => {
        if (ex.exerciseId && ids.has(ex.exerciseId)) return ex
        const id = byName.get(normalizeName(ex.name))
        if (!id || id === ex.exerciseId) return ex
        touched = true
        return { ...ex, exerciseId: id }
      }),
    }))
    if (!touched) continue
    const { exercises: _legacy, ...rest } = w
    changed.push({ ...rest, blocks, updatedAt: now })
  }
  if (changed.length) await db.workouts.bulkPut(changed)
}

/** Height/weight used to live on the client profile; they become the first measurement entry. */
async function moveBodyData() {
  const clients = await db.clients.filter((c) => c.heightCm != null || c.weightKg != null).toArray()
  if (!clients.length) return
  await db.transaction('rw', db.clients, db.measurements, async () => {
    const now = Date.now()
    for (const c of clients) {
      const existing = await db.measurements.where('clientId').equals(c.id).count()
      if (!existing) {
        await db.measurements.add({
          id: uid(),
          clientId: c.id,
          date: toISODate(new Date(c.createdAt || now)),
          weightKg: c.weightKg ?? null,
          heightCm: c.heightCm ?? null,
          createdAt: now,
          updatedAt: now,
        })
      }
      await db.clients.update(c.id, { heightCm: null, weightKg: null, updatedAt: now })
    }
  })
}

async function run() {
  await linkExercises()
  await moveBodyData()
}

let queue: Promise<void> = Promise.resolve()

/** Idempotent clean-up of legacy shapes; safe to call after any import or cloud pull. */
export function normalizeLocalData(): Promise<void> {
  queue = queue.then(run).catch((err) => console.error('normalizeLocalData', err))
  return queue
}
