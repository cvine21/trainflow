import { db, type Metric, type Workout, type WorkoutExercise, type WorkoutSet } from '@/lib/db'
import { countLabel, formatDuration, formatNumber, todayISO } from '@/lib/format'
import { uid } from '@/lib/id'

export const METRIC_LABELS: Record<Metric, { short: string; full: string; unit: string }> = {
  reps: { short: 'Повт.', full: 'Повторения', unit: '' },
  weight: { short: 'Вес', full: 'Вес, кг', unit: 'кг' },
  time: { short: 'Время', full: 'Время', unit: '' },
  distance: { short: 'Дист.', full: 'Дистанция, м', unit: 'м' },
}

export const METRIC_ORDER: Metric[] = ['reps', 'weight', 'time', 'distance']

export function sortMetrics(metrics: Metric[]): Metric[] {
  return METRIC_ORDER.filter((m) => metrics.includes(m))
}

export function emptySet(): WorkoutSet {
  return { id: uid(), reps: null, weight: null, timeSec: null, distance: null, done: false }
}

export function newExercise(name: string, metrics: Metric[], sets?: WorkoutSet[]): WorkoutExercise {
  return {
    id: uid(),
    name,
    metrics: sortMetrics(metrics.length ? metrics : ['reps', 'weight']),
    sets: sets?.length ? sets : [emptySet(), emptySet(), emptySet()],
    restSec: null,
    note: '',
  }
}

export function formatSet(set: WorkoutSet, metrics: Metric[]): string {
  const parts: string[] = []
  for (const m of sortMetrics(metrics)) {
    if (m === 'reps' && set.reps != null) parts.push(`${formatNumber(set.reps)} повт.`)
    if (m === 'weight' && set.weight != null) parts.push(`${formatNumber(set.weight)} кг`)
    if (m === 'time' && set.timeSec != null) parts.push(formatDuration(set.timeSec))
    if (m === 'distance' && set.distance != null) parts.push(`${formatNumber(set.distance)} м`)
  }
  return parts.join(' × ') || '—'
}

/** Compact form like "3×10 · 40 кг" when all sets are identical. */
export function summarizeSets(ex: WorkoutExercise): string {
  if (!ex.sets.length) return 'Без подходов'
  const formatted = ex.sets.map((s) => formatSet(s, ex.metrics))
  if (formatted.every((f) => f === '—')) return countLabel(ex.sets.length, ['подход', 'подхода', 'подходов'])
  const allSame = formatted.every((f) => f === formatted[0])
  if (allSame) {
    const s = ex.sets[0]!
    if (ex.metrics.includes('reps') && s.reps != null) {
      const rest = formatSet({ ...s, reps: null }, ex.metrics)
      return `${ex.sets.length}×${formatNumber(s.reps)}${rest !== '—' ? ` · ${rest}` : ''}`
    }
    return `${ex.sets.length} × ${formatted[0]}`
  }
  return formatted.join(', ')
}

export function workoutTonnage(w: Pick<Workout, 'exercises'>): number {
  let total = 0
  for (const ex of w.exercises) {
    for (const s of ex.sets) {
      if (s.reps != null && s.weight != null) total += s.reps * s.weight
    }
  }
  return total
}

export function workoutSetCount(w: Pick<Workout, 'exercises'>): number {
  return w.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)
}

export function cloneExercises(exercises: WorkoutExercise[]): WorkoutExercise[] {
  return exercises.map((ex) => ({
    ...ex,
    id: uid(),
    sets: ex.sets.map((s) => ({ ...s, id: uid(), done: false })),
  }))
}

export async function duplicateWorkout(source: Workout, overrides: Partial<Workout> = {}): Promise<string> {
  const now = Date.now()
  const id = uid()
  await db.workouts.add({
    ...source,
    id,
    date: todayISO(),
    status: 'planned',
    notes: '',
    exercises: cloneExercises(source.exercises),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  })
  return id
}

export interface LastPerformance {
  date: string
  exercise: WorkoutExercise
}

/** Most recent completed workout of the client that contains this exercise. */
export async function findLastPerformance(
  clientId: string,
  exerciseName: string,
  excludeWorkoutId?: string,
): Promise<LastPerformance | null> {
  const target = exerciseName.trim().toLowerCase()
  const workouts = await db.workouts
    .where('[clientId+date]')
    .between([clientId, ''], [clientId, '\uffff'])
    .reverse()
    .toArray()
  for (const w of workouts) {
    if (w.id === excludeWorkoutId || w.status !== 'completed') continue
    const ex = w.exercises.find((e) => e.name.trim().toLowerCase() === target)
    if (ex) return { date: w.date, exercise: ex }
  }
  return null
}

export interface ExerciseStat {
  name: string
  count: number
  lastDate: string
  maxWeight: number | null
  maxReps: number | null
  lastSummary: string
}

export function exerciseStats(workouts: Workout[]): ExerciseStat[] {
  const map = new Map<string, ExerciseStat>()
  const sorted = [...workouts].filter((w) => w.status === 'completed').sort((a, b) => a.date.localeCompare(b.date))
  for (const w of sorted) {
    for (const ex of w.exercises) {
      const key = ex.name.trim().toLowerCase()
      const stat = map.get(key) ?? {
        name: ex.name,
        count: 0,
        lastDate: w.date,
        maxWeight: null,
        maxReps: null,
        lastSummary: '',
      }
      stat.count += 1
      stat.lastDate = w.date
      stat.lastSummary = summarizeSets(ex)
      for (const s of ex.sets) {
        if (s.weight != null) stat.maxWeight = Math.max(stat.maxWeight ?? 0, s.weight)
        if (s.reps != null) stat.maxReps = Math.max(stat.maxReps ?? 0, s.reps)
      }
      map.set(key, stat)
    }
  }
  return [...map.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate) || b.count - a.count)
}
