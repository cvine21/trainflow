import { db, type Client, type Exercise, type Workout } from '@/lib/db'
import { todayISO } from '@/lib/format'

interface BackupFile {
  app: 'coach-journal'
  version: 1
  exportedAt: string
  clients: Client[]
  workouts: Workout[]
  exercises: Exercise[]
}

export async function exportBackup(): Promise<void> {
  const data: BackupFile = {
    app: 'coach-journal',
    version: 1,
    exportedAt: new Date().toISOString(),
    clients: await db.clients.toArray(),
    workouts: await db.workouts.toArray(),
    exercises: await db.exercises.toArray(),
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
  await db.transaction('rw', db.clients, db.workouts, db.exercises, async () => {
    await db.clients.bulkPut(data.clients)
    await db.workouts.bulkPut(data.workouts)
    if (Array.isArray(data.exercises)) {
      for (const ex of data.exercises) {
        const sameName = await db.exercises.where('name').equalsIgnoreCase(ex.name).first()
        if (!sameName) await db.exercises.put(ex)
      }
    }
  })
  return { clients: data.clients.length, workouts: data.workouts.length }
}

export async function wipeAllData(): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.clients, db.workouts, db.tombstones, async () => {
    const clientIds = await db.clients.toCollection().primaryKeys()
    const workoutIds = await db.workouts.toCollection().primaryKeys()
    await db.tombstones.bulkPut([
      ...clientIds.map((id) => ({ id: String(id), entity: 'clients' as const, deletedAt: now })),
      ...workoutIds.map((id) => ({ id: String(id), entity: 'workouts' as const, deletedAt: now })),
    ])
    await db.clients.clear()
    await db.workouts.clear()
  })
}
