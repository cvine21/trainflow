import Dexie, { type EntityTable } from 'dexie'
import { uid } from '@/lib/id'

export interface Client {
  id: string
  name: string
  phone?: string
  birthDate?: string
  /** Height in centimetres. */
  heightCm?: number | null
  /** Current body weight in kilograms. */
  weightKg?: number | null
  goal?: string
  health?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export type Metric = 'reps' | 'weight' | 'time' | 'distance'

export interface WorkoutSet {
  id: string
  reps?: number | null
  weight?: number | null
  timeSec?: number | null
  distance?: number | null
  done?: boolean
}

export interface WorkoutExercise {
  id: string
  name: string
  metrics: Metric[]
  sets: WorkoutSet[]
  restSec?: number | null
  note?: string
}

export type WorkoutStatus = 'planned' | 'completed'

export interface Workout {
  id: string
  clientId: string
  date: string
  title: string
  status: WorkoutStatus
  exercises: WorkoutExercise[]
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface Exercise {
  id: string
  name: string
  category: string
  metrics: Metric[]
  createdAt: number
  updatedAt: number
}

export type SyncEntity = 'clients' | 'workouts' | 'exercises'

/** Local hard-delete marker so removals can be pushed to Supabase. */
export interface Tombstone {
  id: string
  entity: SyncEntity
  deletedAt: number
}

export const EXERCISE_CATEGORIES = [
  'Ноги',
  'Спина',
  'Грудь',
  'Плечи',
  'Руки',
  'Кор',
  'Кардио',
  'Функциональные',
  'Мобильность',
  'Другое',
] as const

const DEFAULT_EXERCISES: Array<[string, string, Metric[]]> = [
  ['Приседания со штангой', 'Ноги', ['reps', 'weight']],
  ['Гоблет-присед', 'Ноги', ['reps', 'weight']],
  ['Выпады с гантелями', 'Ноги', ['reps', 'weight']],
  ['Болгарские сплит-приседания', 'Ноги', ['reps', 'weight']],
  ['Румынская тяга', 'Ноги', ['reps', 'weight']],
  ['Ягодичный мост', 'Ноги', ['reps', 'weight']],
  ['Зашагивания на тумбу', 'Ноги', ['reps', 'weight']],
  ['Становая тяга', 'Спина', ['reps', 'weight']],
  ['Подтягивания', 'Спина', ['reps', 'weight']],
  ['Тяга гантели в наклоне', 'Спина', ['reps', 'weight']],
  ['Тяга TRX', 'Спина', ['reps']],
  ['Тяга верхнего блока', 'Спина', ['reps', 'weight']],
  ['Жим лёжа', 'Грудь', ['reps', 'weight']],
  ['Отжимания', 'Грудь', ['reps']],
  ['Жим гантелей на наклонной', 'Грудь', ['reps', 'weight']],
  ['Жим гантелей стоя', 'Плечи', ['reps', 'weight']],
  ['Армейский жим', 'Плечи', ['reps', 'weight']],
  ['Разведения в стороны', 'Плечи', ['reps', 'weight']],
  ['Сгибания на бицепс', 'Руки', ['reps', 'weight']],
  ['Отжимания на брусьях', 'Руки', ['reps', 'weight']],
  ['Планка', 'Кор', ['time']],
  ['Боковая планка', 'Кор', ['time']],
  ['Скручивания', 'Кор', ['reps']],
  ['Подъём ног в висе', 'Кор', ['reps']],
  ['Русские скручивания', 'Кор', ['reps', 'weight']],
  ['Гребной тренажёр', 'Кардио', ['distance', 'time']],
  ['Велотренажёр (Assault bike)', 'Кардио', ['time']],
  ['Скакалка', 'Кардио', ['reps', 'time']],
  ['Бег', 'Кардио', ['distance', 'time']],
  ['Махи гирей', 'Функциональные', ['reps', 'weight']],
  ['Бёрпи', 'Функциональные', ['reps']],
  ['Трастеры', 'Функциональные', ['reps', 'weight']],
  ['Броски мяча в цель (Wall ball)', 'Функциональные', ['reps', 'weight']],
  ['Прыжки на тумбу', 'Функциональные', ['reps']],
  ['Фермерская прогулка', 'Функциональные', ['distance', 'weight']],
  ['Толчок саней', 'Функциональные', ['distance', 'weight']],
  ['Канаты (Battle ropes)', 'Функциональные', ['time']],
  ['Турецкий подъём', 'Функциональные', ['reps', 'weight']],
  ['Медвежья походка', 'Мобильность', ['distance']],
  ['Кошка-корова', 'Мобильность', ['reps']],
  ['Растяжка «90/90»', 'Мобильность', ['time']],
]

class CoachDB extends Dexie {
  clients!: EntityTable<Client, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  tombstones!: EntityTable<Tombstone, 'id'>

  constructor() {
    super('coach-journal')
    this.version(1).stores({
      clients: 'id, name, createdAt',
      workouts: 'id, clientId, date, status, [clientId+date]',
      exercises: 'id, &name, category',
    })
    this.version(2)
      .stores({
        clients: 'id, name, createdAt, updatedAt',
        workouts: 'id, clientId, date, status, [clientId+date], updatedAt',
        exercises: 'id, name, category, updatedAt',
        tombstones: 'id, entity, deletedAt',
      })
      .upgrade(async (tx) => {
        const exercises = tx.table('exercises')
        await exercises.toCollection().modify((ex: Exercise) => {
          if (ex.updatedAt == null) ex.updatedAt = ex.createdAt ?? Date.now()
        })
      })
    this.on('populate', (tx) => {
      const now = Date.now()
      return tx.table('exercises').bulkAdd(
        DEFAULT_EXERCISES.map(([name, category, metrics], i) => ({
          id: uid(),
          name,
          category,
          metrics,
          createdAt: now + i,
          updatedAt: now + i,
        })),
      )
    })
  }
}

export const db = new CoachDB()

async function addTombstone(id: string, entity: SyncEntity, deletedAt = Date.now()) {
  await db.tombstones.put({ id, entity, deletedAt })
}

export async function deleteClientCascade(clientId: string) {
  const now = Date.now()
  await db.transaction('rw', db.clients, db.workouts, db.tombstones, async () => {
    const workoutIds = await db.workouts.where('clientId').equals(clientId).primaryKeys()
    for (const wid of workoutIds) await addTombstone(String(wid), 'workouts', now)
    await db.workouts.where('clientId').equals(clientId).delete()
    await addTombstone(clientId, 'clients', now)
    await db.clients.delete(clientId)
  })
}

export async function deleteWorkout(workoutId: string) {
  const now = Date.now()
  await db.transaction('rw', db.workouts, db.tombstones, async () => {
    await addTombstone(workoutId, 'workouts', now)
    await db.workouts.delete(workoutId)
  })
}

export async function deleteExercise(exerciseId: string) {
  const now = Date.now()
  await db.transaction('rw', db.exercises, db.tombstones, async () => {
    await addTombstone(exerciseId, 'exercises', now)
    await db.exercises.delete(exerciseId)
  })
}

export async function ensureExerciseInLibrary(name: string, metrics: Metric[]) {
  const trimmed = name.trim()
  if (!trimmed) return
  const existing = await db.exercises.where('name').equalsIgnoreCase(trimmed).first()
  if (existing) return
  const now = Date.now()
  await db.exercises.add({
    id: uid(),
    name: trimmed,
    category: 'Другое',
    metrics,
    createdAt: now,
    updatedAt: now,
  })
}
