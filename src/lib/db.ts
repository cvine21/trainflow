import Dexie, { type EntityTable } from 'dexie'
import { uid } from '@/lib/id'

export interface Client {
  id: string
  name: string
  phone?: string
  birthDate?: string
  /** Legacy: moved into measurements by normalizeLocalData. */
  heightCm?: number | null
  /** Legacy: moved into measurements by normalizeLocalData. */
  weightKg?: number | null
  goal?: string
  health?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export type Metric = 'reps' | 'weight' | 'band' | 'time' | 'distance' | 'calories'

export interface WorkoutSet {
  id: string
  reps?: number | null
  weight?: number | null
  /** Resistance band level, one of BAND_LEVELS. */
  band?: string | null
  timeSec?: number | null
  distance?: number | null
  calories?: number | null
}

export interface WorkoutExercise {
  id: string
  /** Library exercise; history and progress are matched by it. */
  exerciseId?: string
  name: string
  metrics: Metric[]
  sets: WorkoutSet[]
  restSec?: number | null
  note?: string
}

export type BlockFormat = 'sets' | 'superset' | 'rounds' | 'emom' | 'amrap' | 'fortime'

export interface BlockResult {
  timeSec?: number | null
  rounds?: number | null
  reps?: number | null
  note?: string
}

export interface WorkoutBlock {
  id: string
  format: BlockFormat
  /** rounds, fortime */
  rounds?: number | null
  /** emom total, amrap cap, fortime cap */
  durationSec?: number | null
  /** emom interval */
  intervalSec?: number | null
  /** In circuit formats every exercise keeps a single prescription in sets[0]. */
  exercises: WorkoutExercise[]
  result?: BlockResult
}

export type WorkoutStatus = 'planned' | 'completed'

export interface Workout {
  id: string
  clientId: string
  date: string
  /** 'HH:MM' */
  time?: string
  title: string
  status: WorkoutStatus
  blocks: WorkoutBlock[]
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface Measurement {
  id: string
  clientId: string
  date: string
  weightKg?: number | null
  heightCm?: number | null
  chestCm?: number | null
  waistCm?: number | null
  hipsCm?: number | null
  thighCm?: number | null
  armCm?: number | null
  bodyFatPct?: number | null
  note?: string
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

export type SyncEntity = 'clients' | 'workouts' | 'exercises' | 'measurements'

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
  ['Гребной тренажёр', 'Кардио', ['calories']],
  ['Велотренажёр (Assault bike)', 'Кардио', ['calories']],
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

/** Earlier defaults that should switch to calories, keyed by name. */
const CARDIO_TO_CALORIES: Record<string, string> = {
  'Гребной тренажёр': 'distance,time',
  'Велотренажёр (Assault bike)': 'time',
}

/** Wraps the pre-blocks flat exercise list: every exercise becomes a straight-sets block. */
export function legacyBlocks(exercises: unknown): WorkoutBlock[] {
  if (!Array.isArray(exercises)) return []
  return (exercises as WorkoutExercise[]).map((ex) => ({
    id: uid(),
    format: 'sets',
    exercises: [{ ...ex, sets: (ex.sets ?? []).map(({ done: _done, ...s }: WorkoutSet & { done?: boolean }) => s) }],
  }))
}

class CoachDB extends Dexie {
  clients!: EntityTable<Client, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  measurements!: EntityTable<Measurement, 'id'>
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
    this.version(3)
      .stores({
        measurements: 'id, clientId, date, [clientId+date], updatedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('workouts')
          .toCollection()
          .modify((w: Workout & { exercises?: unknown }) => {
            if (!Array.isArray(w.blocks)) w.blocks = legacyBlocks(w.exercises)
            delete w.exercises
          })
        const now = Date.now()
        await tx
          .table('exercises')
          .toCollection()
          .modify((ex: Exercise) => {
            const old = CARDIO_TO_CALORIES[ex.name]
            if (old && ex.metrics.join(',') === old) {
              ex.metrics = ['calories']
              ex.updatedAt = now
            }
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

export async function addTombstone(id: string, entity: SyncEntity, deletedAt = Date.now()) {
  await db.tombstones.put({ id, entity, deletedAt })
}

export async function deleteClientCascade(clientId: string) {
  const now = Date.now()
  await db.transaction('rw', db.clients, db.workouts, db.measurements, db.tombstones, async () => {
    const workoutIds = await db.workouts.where('clientId').equals(clientId).primaryKeys()
    for (const wid of workoutIds) await addTombstone(String(wid), 'workouts', now)
    await db.workouts.where('clientId').equals(clientId).delete()
    const measurementIds = await db.measurements.where('clientId').equals(clientId).primaryKeys()
    for (const mid of measurementIds) await addTombstone(String(mid), 'measurements', now)
    await db.measurements.where('clientId').equals(clientId).delete()
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

export async function deleteMeasurement(measurementId: string) {
  const now = Date.now()
  await db.transaction('rw', db.measurements, db.tombstones, async () => {
    await addTombstone(measurementId, 'measurements', now)
    await db.measurements.delete(measurementId)
  })
}
