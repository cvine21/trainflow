import { db, legacyBlocks, type Client, type Exercise, type Measurement, type Workout } from '@/lib/db'
import { normalizeName, todayISO } from '@/lib/format'
import { normalizeLocalData } from '@/lib/migrations'

interface BackupFile {
  app: 'coach-journal'
  version: 1 | 2
  exportedAt: string
  clients: Client[]
  workouts: Workout[]
  exercises: Exercise[]
  measurements?: Measurement[]
}

export async function exportBackup(): Promise<void> {
  const data: BackupFile = {
    app: 'coach-journal',
    version: 2,
    exportedAt: new Date().toISOString(),
    clients: await db.clients.toArray(),
    workouts: await db.workouts.toArray(),
    exercises: await db.exercises.toArray(),
    measurements: await db.measurements.toArray(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `coach-journal-${todayISO()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function importBackup(file: File): Promise<{ clients: number; workouts: number }> {
  const text = await file.text()
  let data: BackupFile
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Файл повреждён или это не JSON')
  }
  if (data?.app !== 'coach-journal' || !Array.isArray(data.clients) || !Array.isArray(data.workouts)) {
    throw new Error('Это не резервная копия журнала тренера')
  }
  const workouts = data.workouts.map((w) => {
    if (Array.isArray(w.blocks)) return w
    const { exercises, ...rest } = w as Workout & { exercises?: unknown }
    return { ...rest, blocks: legacyBlocks(exercises) }
  })
  await db.transaction('rw', db.clients, db.workouts, db.exercises, db.measurements, async () => {
    await db.clients.bulkPut(data.clients)
    await db.workouts.bulkPut(workouts)
    if (Array.isArray(data.measurements)) await db.measurements.bulkPut(data.measurements)
    if (Array.isArray(data.exercises)) {
      const known = new Set((await db.exercises.toArray()).map((e) => normalizeName(e.name)))
      for (const ex of data.exercises) {
        if (!known.has(normalizeName(ex.name))) await db.exercises.put(ex)
      }
    }
  })
  await normalizeLocalData()
  return { clients: data.clients.length, workouts: workouts.length }
}
