import {
  db,
  type BlockFormat,
  type Exercise,
  type Metric,
  type Workout,
  type WorkoutBlock,
  type WorkoutExercise,
  type WorkoutSet,
} from '@/lib/db'
import { formatClock, formatDate, formatNumber, normalizeName, plural, todayISO } from '@/lib/format'
import { uid } from '@/lib/id'

export const METRIC_LABELS: Record<Metric, { short: string; full: string; unit: string }> = {
  reps: { short: 'Повт.', full: 'Повторения', unit: 'повт.' },
  weight: { short: 'Вес', full: 'Вес, кг', unit: 'кг' },
  band: { short: 'Резина', full: 'Резина', unit: '' },
  time: { short: 'Время', full: 'Время', unit: '' },
  distance: { short: 'Дист.', full: 'Дистанция, м', unit: 'м' },
  calories: { short: 'Кал', full: 'Калории', unit: 'кал' },
}

export const METRIC_ORDER: Metric[] = ['reps', 'weight', 'band', 'time', 'distance', 'calories']

/** Metrics the coach toggles freely; load (kg / band / bodyweight) is chosen separately. */
export const BASE_METRICS: Metric[] = ['reps', 'time', 'distance', 'calories']

export type LoadType = 'kg' | 'band' | 'bodyweight'

export const LOAD_LABELS: Record<LoadType, string> = { kg: 'Кг', band: 'Резина', bodyweight: 'Свой вес' }

/** Light to heavy. */
export const BAND_LEVELS = ['Жёлтая', 'Красная', 'Чёрная', 'Фиолетовая', 'Зелёная', 'Синяя'] as const

export const BAND_COLORS: Record<string, string> = {
  Жёлтая: '#facc15',
  Красная: '#dc2626',
  Чёрная: '#18181b',
  Фиолетовая: '#7c3aed',
  Зелёная: '#16a34a',
  Синяя: '#2563eb',
}

export const SET_FIELD = {
  reps: 'reps',
  weight: 'weight',
  band: 'band',
  time: 'timeSec',
  distance: 'distance',
  calories: 'calories',
} as const satisfies Record<Metric, keyof WorkoutSet>

export function sortMetrics(metrics: Metric[]): Metric[] {
  return METRIC_ORDER.filter((m) => metrics.includes(m))
}

export function loadOf(metrics: Metric[]): LoadType {
  if (metrics.includes('weight')) return 'kg'
  if (metrics.includes('band')) return 'band'
  return 'bodyweight'
}

export function withLoad(metrics: Metric[], load: LoadType): Metric[] {
  const base: Metric[] = metrics.filter((m) => m !== 'weight' && m !== 'band')
  if (!base.length) base.push('reps')
  if (load === 'kg') base.push('weight')
  if (load === 'band') base.push('band')
  return sortMetrics(base)
}

export function isBodyweight(metrics: Metric[]): boolean {
  return metrics.includes('reps') && loadOf(metrics) === 'bodyweight'
}

export function describeMetrics(metrics: Metric[]): string {
  const parts = sortMetrics(metrics).map((m) => METRIC_LABELS[m].full)
  if (isBodyweight(metrics)) parts.push('свой вес')
  return parts.join(' · ')
}

export function getSetValue(set: WorkoutSet, m: Exclude<Metric, 'band'>): number | null {
  return set[SET_FIELD[m]] ?? null
}

export function emptySet(): WorkoutSet {
  return { id: uid(), reps: null, weight: null, band: null, timeSec: null, distance: null, calories: null }
}

export function newExercise(
  source: Pick<Exercise, 'name' | 'metrics'> & { id?: string },
  sets?: WorkoutSet[],
  setCount = 0,
): WorkoutExercise {
  return {
    id: uid(),
    exerciseId: source.id,
    name: source.name,
    metrics: sortMetrics(source.metrics.length ? source.metrics : ['reps', 'weight']),
    sets: sets?.length ? sets : Array.from({ length: setCount }, emptySet),
    restSec: null,
    note: '',
  }
}

export function formatSet(set: WorkoutSet, metrics: Metric[]): string {
  const parts: string[] = []
  for (const m of sortMetrics(metrics)) {
    if (m === 'reps' && set.reps != null) parts.push(`${formatNumber(set.reps)} повт.`)
    if (m === 'weight' && set.weight != null) parts.push(`${formatNumber(set.weight)} кг`)
    if (m === 'band' && set.band) parts.push(`резина ${set.band.toLowerCase()}`)
    if (m === 'time' && set.timeSec != null) parts.push(formatClock(set.timeSec))
    if (m === 'distance' && set.distance != null) parts.push(`${formatNumber(set.distance)} м`)
    if (m === 'calories' && set.calories != null) parts.push(`${formatNumber(set.calories)} кал`)
  }
  return parts.join(' · ') || '—'
}

/** Runs of consecutive sets with equal values. Sets listed in `apart` never merge with the rest. */
export function groupSets(sets: WorkoutSet[], metrics: Metric[], apart: string[] = []): WorkoutSet[][] {
  const groups: WorkoutSet[][] = []
  let prevKey: string | null = null
  for (const set of sets) {
    const key = `${apart.includes(set.id)}|${formatSet(set, metrics)}`
    if (key === prevKey) groups.at(-1)!.push(set)
    else groups.push([set])
    prevKey = key
  }
  return groups
}

/** "3 × 10 повт. · 16 кг" for repeated sets, plain set otherwise. */
export function formatSetGroup(group: WorkoutSet[], metrics: Metric[]): string {
  const text = formatSet(group[0]!, metrics)
  return group.length > 1 ? `${group.length} × ${text}` : text
}

/** Compact form like "3×10 · 40 кг" when all sets are identical. */
export function summarizeSets(ex: WorkoutExercise): string {
  if (!ex.sets.length) return 'Без подходов'
  const formatted = ex.sets.map((s) => formatSet(s, ex.metrics))
  if (formatted.every((f) => f === '—'))
    return `${ex.sets.length} ${plural(ex.sets.length, ['подход', 'подхода', 'подходов'])}`
  const allSame = formatted.every((f) => f === formatted[0])
  if (allSame) {
    if (ex.sets.length === 1) return formatted[0]!
    const s = ex.sets[0]!
    if (ex.metrics.includes('reps') && s.reps != null) {
      const rest = formatSet({ ...s, reps: null }, ex.metrics)
      return `${ex.sets.length}×${formatNumber(s.reps)}${rest !== '—' ? ` · ${rest}` : ''}`
    }
    return `${ex.sets.length} × ${formatted[0]}`
  }
  return groupSets(ex.sets, ex.metrics)
    .map((g) => formatSetGroup(g, ex.metrics))
    .join(', ')
}

// ---------------------------------------------------------------- blocks

export const BLOCK_FORMATS: Record<BlockFormat, { label: string; description: string }> = {
  sets: { label: 'Подходы', description: 'Одно упражнение, обычные подходы' },
  superset: { label: 'Суперсет', description: 'Упражнения по очереди, у каждого свои подходы' },
  rounds: { label: 'Раунды', description: 'Круг из упражнений на N раундов' },
  emom: { label: 'EMOM', description: 'Каждую минуту (или интервал) — задание' },
  amrap: { label: 'AMRAP', description: 'Максимум раундов за время' },
  fortime: { label: 'На время', description: 'Сделать объём как можно быстрее' },
}

export const BLOCK_FORMAT_ORDER: BlockFormat[] = ['sets', 'superset', 'rounds', 'emom', 'amrap', 'fortime']

export function isCircuit(format: BlockFormat): boolean {
  return format === 'rounds' || format === 'emom' || format === 'amrap' || format === 'fortime'
}

export function blockDefaults(format: BlockFormat): Pick<WorkoutBlock, 'rounds' | 'durationSec' | 'intervalSec'> {
  switch (format) {
    case 'rounds':
      return { rounds: 3, durationSec: null, intervalSec: null }
    case 'emom':
      return { rounds: null, durationSec: 600, intervalSec: 60 }
    case 'amrap':
      return { rounds: null, durationSec: 720, intervalSec: null }
    case 'fortime':
      return { rounds: 1, durationSec: null, intervalSec: null }
    default:
      return { rounds: null, durationSec: null, intervalSec: null }
  }
}

export function newBlock(format: BlockFormat, exercises: WorkoutExercise[] = []): WorkoutBlock {
  return { id: uid(), format, ...blockDefaults(format), exercises }
}

function minutes(sec: number): string {
  return `${formatNumber(Math.round((sec / 60) * 10) / 10)} мин`
}

export function blockTitle(block: Pick<WorkoutBlock, 'format' | 'rounds' | 'durationSec' | 'intervalSec'>): string {
  const { format, rounds, durationSec, intervalSec } = block
  switch (format) {
    case 'sets':
      return 'Подходы'
    case 'superset':
      return 'Суперсет'
    case 'rounds':
      return `${rounds ?? 1} ${plural(rounds ?? 1, ['раунд', 'раунда', 'раундов'])}`
    case 'emom': {
      const every = intervalSec && intervalSec !== 60 ? ` · каждые ${minutes(intervalSec)}` : ''
      return `EMOM ${durationSec ? minutes(durationSec) : ''}${every}`.trim()
    }
    case 'amrap':
      return `AMRAP ${durationSec ? minutes(durationSec) : ''}`.trim()
    case 'fortime': {
      const r = rounds && rounds > 1 ? ` · ${rounds} ${plural(rounds, ['раунд', 'раунда', 'раундов'])}` : ''
      const cap = durationSec ? ` · лимит ${minutes(durationSec)}` : ''
      return `На время${r}${cap}`
    }
  }
}

export function emomIntervals(block: Pick<WorkoutBlock, 'durationSec' | 'intervalSec'>): number | null {
  if (!block.durationSec || !block.intervalSec) return null
  return Math.max(1, Math.round(block.durationSec / block.intervalSec))
}

export function hasResult(block: WorkoutBlock): boolean {
  const r = block.result
  return !!r && (r.timeSec != null || r.rounds != null || r.reps != null || !!r.note?.trim())
}

export function formatBlockResult(block: WorkoutBlock): string {
  const r = block.result
  if (!r) return ''
  const parts: string[] = []
  if (block.format === 'amrap') {
    if (r.rounds != null) parts.push(`${r.rounds} ${plural(r.rounds, ['раунд', 'раунда', 'раундов'])}`)
    if (r.reps != null && r.reps > 0) parts.push(`${r.reps} повт.`)
  } else if (block.format === 'emom') {
    const total = emomIntervals(block)
    if (r.rounds != null) parts.push(total ? `${r.rounds} из ${total}` : `${r.rounds} инт.`)
  } else if (r.timeSec != null) {
    parts.push(formatClock(r.timeSec))
  }
  const main = parts.join(' + ')
  const note = r.note?.trim()
  return [main, note].filter(Boolean).join(' · ')
}

/** Changes a block's format; a straight-sets block holds one exercise, so extra exercises split off. */
export function changeBlockFormat(blocks: WorkoutBlock[], blockId: string, format: BlockFormat): WorkoutBlock[] {
  return blocks.flatMap((b) => {
    if (b.id !== blockId) return [b]
    const toCircuit = isCircuit(format)
    const exercises = b.exercises.map((ex) =>
      toCircuit ? { ...ex, sets: ex.sets.slice(0, 1).length ? ex.sets.slice(0, 1) : [emptySet()] } : ex,
    )
    const keepParams = b.format === format
    const base: WorkoutBlock = {
      ...b,
      format,
      ...(keepParams ? {} : blockDefaults(format)),
      exercises,
      result: keepParams ? b.result : undefined,
    }
    if (format !== 'sets' || exercises.length <= 1) return [base]
    return exercises.map((ex, i) => (i === 0 ? { ...base, exercises: [ex] } : newBlock('sets', [ex])))
  })
}

export function allExercises(w: Pick<Workout, 'blocks'>): WorkoutExercise[] {
  return w.blocks.flatMap((b) => b.exercises)
}

export function workoutPreview(w: Pick<Workout, 'blocks'>): string {
  return w.blocks
    .map((b) => {
      const names = b.exercises.map((e) => e.name)
      if (b.format === 'sets') return names.join(', ')
      if (b.format === 'superset') return names.join(' + ')
      return `${blockTitle(b)}: ${names.join(', ')}`
    })
    .filter(Boolean)
    .join(' · ')
}

export function cloneBlocks(blocks: WorkoutBlock[]): WorkoutBlock[] {
  return blocks.map((b) => ({
    ...b,
    id: uid(),
    result: undefined,
    exercises: b.exercises.map((ex) => ({ ...ex, id: uid(), sets: ex.sets.map((s) => ({ ...s, id: uid() })) })),
  }))
}

export async function createWorkout(clientId: string): Promise<string> {
  const now = Date.now()
  const id = uid()
  await db.workouts.add({
    id,
    clientId,
    date: todayISO(),
    time: '',
    title: '',
    status: 'planned',
    blocks: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
  })
  return id
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
    blocks: cloneBlocks(source.blocks),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  })
  return id
}

export function compareWorkouts(a: Pick<Workout, 'date' | 'time'>, b: Pick<Workout, 'date' | 'time'>): number {
  return a.date.localeCompare(b.date) || (a.time || '99:99').localeCompare(b.time || '99:99')
}

export function formatWhen(w: Pick<Workout, 'date' | 'time'>, opts?: Parameters<typeof formatDate>[1]): string {
  const date = formatDate(w.date, opts)
  return w.time ? `${date}, ${w.time}` : date
}

// ---------------------------------------------------------------- history & progress

type ExerciseRef = Pick<WorkoutExercise, 'exerciseId' | 'name'>

export function exerciseKey(ex: ExerciseRef): string {
  return ex.exerciseId ?? `name:${normalizeName(ex.name)}`
}

function sameExercise(a: ExerciseRef, b: ExerciseRef): boolean {
  if (a.exerciseId && b.exerciseId) return a.exerciseId === b.exerciseId
  return normalizeName(a.name) === normalizeName(b.name)
}

export interface LastPerformance {
  date: string
  exercise: WorkoutExercise
  format: BlockFormat
}

/** Most recent completed workout of the client that contains this exercise. */
export async function findLastPerformance(
  clientId: string,
  ref: ExerciseRef,
  excludeWorkoutId?: string,
): Promise<LastPerformance | null> {
  if (!ref.exerciseId && !ref.name.trim()) return null
  const workouts = await db.workouts
    .where('[clientId+date]')
    .between([clientId, ''], [clientId, '\uffff'])
    .reverse()
    .toArray()
  for (const w of workouts) {
    if (w.id === excludeWorkoutId || w.status !== 'completed') continue
    for (const b of w.blocks) {
      const ex = b.exercises.find((e) => sameExercise(e, ref))
      if (ex) return { date: w.date, exercise: ex, format: b.format }
    }
  }
  return null
}

/** Epley; only meaningful for kg sets up to 12 reps. */
export function estimateOneRepMax(weight: number, reps: number): number | null {
  if (weight <= 0 || reps < 1 || reps > 12) return null
  return reps === 1 ? weight : weight * (1 + reps / 30)
}

type ProgressMetric = 'e1rm' | 'weight' | 'reps' | 'calories' | 'distance' | 'time'

const PROGRESS_LABEL: Record<ProgressMetric, { label: string; unit: string }> = {
  e1rm: { label: 'Расчётный 1ПМ', unit: 'кг' },
  weight: { label: 'Лучший вес', unit: 'кг' },
  reps: { label: 'Лучшие повторы', unit: 'повт.' },
  calories: { label: 'Калории', unit: 'кал' },
  distance: { label: 'Дистанция', unit: 'м' },
  time: { label: 'Время', unit: 'с' },
}

function primaryOf(metrics: Metric[]): Exclude<ProgressMetric, 'e1rm'> {
  if (metrics.includes('weight')) return 'weight'
  if (metrics.includes('reps')) return 'reps'
  if (metrics.includes('calories')) return 'calories'
  if (metrics.includes('distance')) return 'distance'
  return 'time'
}

function setScore(s: WorkoutSet, primary: Exclude<ProgressMetric, 'e1rm'>): [number, number] {
  switch (primary) {
    case 'weight':
      return [s.weight ?? -1, s.reps ?? 0]
    case 'reps':
      return [s.reps ?? -1, 0]
    case 'calories':
      return [s.calories ?? -1, 0]
    case 'distance':
      return [s.distance ?? -1, 0]
    case 'time':
      return [s.timeSec ?? -1, 0]
  }
}

function better(a: [number, number], b: [number, number]): boolean {
  return a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])
}

/** "100 кг × 5" — load first, as coaches read it. */
export function formatBestSet(set: WorkoutSet, metrics: Metric[]): string {
  const parts: string[] = []
  if (metrics.includes('weight') && set.weight != null) parts.push(`${formatNumber(set.weight)} кг`)
  if (metrics.includes('reps') && set.reps != null)
    parts.push(parts.length ? `${formatNumber(set.reps)}` : `${formatNumber(set.reps)} повт.`)
  const rest = formatSet({ ...set, weight: null, reps: null }, metrics)
  if (rest !== '—') parts.push(rest)
  return parts.join(' × ') || '—'
}

export interface ExerciseSession {
  workoutId: string
  date: string
  best: WorkoutSet
  bestLabel: string
  e1rm: number | null
  summary: string
}

export interface ExerciseProgress {
  key: string
  name: string
  metrics: Metric[]
  /** Oldest first. */
  sessions: ExerciseSession[]
  best: WorkoutSet
  bestLabel: string
  bestE1rm: number | null
  chart: { label: string; unit: string; points: Array<{ date: string; value: number }> }
}

export function exerciseProgress(workouts: Workout[]): ExerciseProgress[] {
  const sorted = workouts.filter((w) => w.status === 'completed').sort(compareWorkouts)
  const groups = new Map<string, { name: string; metrics: Metric[]; entries: Array<[Workout, WorkoutExercise]> }>()
  for (const w of sorted) {
    for (const ex of allExercises(w)) {
      if (!ex.sets.length) continue
      const key = exerciseKey(ex)
      const g = groups.get(key) ?? { name: ex.name, metrics: ex.metrics, entries: [] }
      g.name = ex.name
      g.metrics = ex.metrics
      g.entries.push([w, ex])
      groups.set(key, g)
    }
  }

  const result: ExerciseProgress[] = []
  for (const [key, g] of groups) {
    const primary = primaryOf(g.metrics)
    const sessions: ExerciseSession[] = []
    for (const [w, ex] of g.entries) {
      const p = primaryOf(ex.metrics)
      let best: WorkoutSet | null = null
      let e1rm: number | null = null
      for (const s of ex.sets) {
        if (!best || better(setScore(s, p), setScore(best, p))) best = s
        if (s.weight != null && s.reps != null) {
          const est = estimateOneRepMax(s.weight, s.reps)
          if (est != null && (e1rm == null || est > e1rm)) e1rm = est
        }
      }
      if (!best || setScore(best, p)[0] < 0) continue
      sessions.push({
        workoutId: w.id,
        date: w.date,
        best,
        bestLabel: formatBestSet(best, ex.metrics),
        e1rm,
        summary: summarizeSets(ex),
      })
    }
    if (!sessions.length) continue

    let top = sessions[0]!
    for (const s of sessions) if (better(setScore(s.best, primary), setScore(top.best, primary))) top = s
    const e1rms = sessions.map((s) => s.e1rm).filter((v): v is number => v != null)
    const chartMetric: ProgressMetric = primary === 'weight' && e1rms.length ? 'e1rm' : primary
    const points = sessions
      .map((s) => ({
        date: s.date,
        value: chartMetric === 'e1rm' ? s.e1rm : setScore(s.best, primary)[0],
      }))
      .filter((p): p is { date: string; value: number } => p.value != null && p.value >= 0)
      .map((p) => ({ ...p, value: chartMetric === 'e1rm' ? Math.round(p.value) : Math.round(p.value * 10) / 10 }))

    result.push({
      key,
      name: g.name,
      metrics: g.metrics,
      sessions,
      best: top.best,
      bestLabel: top.bestLabel,
      bestE1rm: e1rms.length ? Math.max(...e1rms) : null,
      chart: { ...PROGRESS_LABEL[chartMetric], points },
    })
  }
  return result.sort(
    (a, b) => b.sessions.at(-1)!.date.localeCompare(a.sessions.at(-1)!.date) || b.sessions.length - a.sessions.length,
  )
}
