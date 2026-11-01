import type { Session, SupabaseClient } from '@supabase/supabase-js'
import {
  db,
  type Client,
  type Exercise,
  type Metric,
  type SyncEntity,
  type Workout,
  type WorkoutStatus,
} from '@/lib/db'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

const LAST_SYNC_KEY = 'coach-journal:lastSyncedAt'

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error' | 'offline' | 'unconfigured'

export interface SyncResult {
  pushed: number
  pulled: number
  deleted: number
}

type Listener = (status: SyncStatus, error?: string) => void

let syncing = false
let timer: ReturnType<typeof setTimeout> | undefined
let lastError: string | undefined
const listeners = new Set<Listener>()

export function getLastSyncedAt(): number {
  const raw = localStorage.getItem(LAST_SYNC_KEY)
  const n = raw ? Number(raw) : 0
  return Number.isFinite(n) ? n : 0
}

function setLastSyncedAt(ts: number) {
  localStorage.setItem(LAST_SYNC_KEY, String(ts))
}

export function clearSyncMeta() {
  localStorage.removeItem(LAST_SYNC_KEY)
}

export function subscribeSyncStatus(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit(status: SyncStatus, error?: string) {
  lastError = error
  for (const l of listeners) l(status, error)
}

export function getSyncError(): string | undefined {
  return lastError
}

function msToIso(ms: number | null | undefined): string | null {
  if (ms == null) return null
  return new Date(ms).toISOString()
}

/** Supabase stores timestamptz optionally; we use bigint ms in schema. */
function rowUpdatedAt(row: { updated_at: number | string }): number {
  return typeof row.updated_at === 'number' ? row.updated_at : Date.parse(String(row.updated_at))
}

function clientToRow(c: Client, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    name: c.name,
    phone: c.phone ?? null,
    birth_date: c.birthDate ?? null,
    height_cm: c.heightCm ?? null,
    weight_kg: c.weightKg ?? null,
    goal: c.goal ?? null,
    health: c.health ?? null,
    notes: c.notes ?? null,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    deleted_at: null as number | null,
  }
}

function rowToClient(row: Record<string, unknown>): Client {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    phone: (row.phone as string) || undefined,
    birthDate: (row.birth_date as string) || undefined,
    heightCm: (row.height_cm as number | null) ?? null,
    weightKg: (row.weight_kg as number | null) ?? null,
    goal: (row.goal as string) || undefined,
    health: (row.health as string) || undefined,
    notes: (row.notes as string) || undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

function workoutToRow(w: Workout, userId: string) {
  return {
    id: w.id,
    user_id: userId,
    client_id: w.clientId,
    date: w.date,
    title: w.title,
    status: w.status,
    exercises: w.exercises,
    notes: w.notes ?? null,
    created_at: w.createdAt,
    updated_at: w.updatedAt,
    deleted_at: null as number | null,
  }
}

function rowToWorkout(row: Record<string, unknown>): Workout {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    date: String(row.date),
    title: String(row.title ?? ''),
    status: row.status as WorkoutStatus,
    exercises: (row.exercises as Workout['exercises']) ?? [],
    notes: (row.notes as string) || undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

function exerciseToRow(e: Exercise, userId: string) {
  return {
    id: e.id,
    user_id: userId,
    name: e.name,
    category: e.category,
    metrics: e.metrics,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
    deleted_at: null as number | null,
  }
}

function rowToExercise(row: Record<string, unknown>): Exercise {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    category: String(row.category ?? 'Другое'),
    metrics: (row.metrics as Metric[]) ?? [],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

async function pushTable(supabase: SupabaseClient, userId: string, table: SyncEntity, since: number): Promise<number> {
  let pushed = 0
  if (table === 'clients') {
    const rows = (await db.clients.filter((c) => c.updatedAt > since).toArray()).map((c) => clientToRow(c, userId))
    if (rows.length) {
      const { error } = await supabase.from('clients').upsert(rows, { onConflict: 'id' })
      if (error) throw error
      pushed += rows.length
    }
  } else if (table === 'workouts') {
    const rows = (await db.workouts.filter((w) => w.updatedAt > since).toArray()).map((w) => workoutToRow(w, userId))
    if (rows.length) {
      const { error } = await supabase.from('workouts').upsert(rows, { onConflict: 'id' })
      if (error) throw error
      pushed += rows.length
    }
  } else {
    const rows = (await db.exercises.filter((e) => e.updatedAt > since).toArray()).map((e) => exerciseToRow(e, userId))
    if (rows.length) {
      const { error } = await supabase.from('exercises').upsert(rows, { onConflict: 'id' })
      if (error) throw error
      pushed += rows.length
    }
  }
  return pushed
}

async function pushTombstones(supabase: SupabaseClient, userId: string): Promise<number> {
  const stones = await db.tombstones.toArray()
  if (!stones.length) return 0
  let pushed = 0
  for (const stone of stones) {
    const patch = { updated_at: stone.deletedAt, deleted_at: stone.deletedAt }
    const { data, error } = await supabase
      .from(stone.entity)
      .update(patch)
      .eq('id', stone.id)
      .eq('user_id', userId)
      .select('id')
    if (error) throw error
    if (!data?.length) {
      // Never synced — insert a soft-deleted stub so other devices learn about the removal.
      let upsertError
      if (stone.entity === 'clients') {
        ;({ error: upsertError } = await supabase.from('clients').upsert(
          {
            id: stone.id,
            user_id: userId,
            name: '(удалено)',
            created_at: stone.deletedAt,
            ...patch,
          },
          { onConflict: 'id' },
        ))
      } else if (stone.entity === 'workouts') {
        ;({ error: upsertError } = await supabase.from('workouts').upsert(
          {
            id: stone.id,
            user_id: userId,
            client_id: '',
            date: '1970-01-01',
            title: '',
            status: 'planned',
            exercises: [],
            created_at: stone.deletedAt,
            ...patch,
          },
          { onConflict: 'id' },
        ))
      } else {
        ;({ error: upsertError } = await supabase.from('exercises').upsert(
          {
            id: stone.id,
            user_id: userId,
            name: '(удалено)',
            category: 'Другое',
            metrics: [],
            created_at: stone.deletedAt,
            ...patch,
          },
          { onConflict: 'id' },
        ))
      }
      if (upsertError) throw upsertError
    }
    await db.tombstones.delete(stone.id)
    pushed += 1
  }
  return pushed
}

async function pullTable(
  supabase: SupabaseClient,
  table: SyncEntity,
  since: number,
): Promise<{ pulled: number; deleted: number }> {
  const { data, error } = await supabase.from(table).select('*').gt('updated_at', since)
  if (error) throw error
  let pulled = 0
  let deleted = 0
  for (const raw of data ?? []) {
    const row = raw as Record<string, unknown>
    const id = String(row.id)
    const deletedAt = row.deleted_at as number | null
    if (deletedAt) {
      if (table === 'clients') await db.clients.delete(id)
      else if (table === 'workouts') await db.workouts.delete(id)
      else await db.exercises.delete(id)
      await db.tombstones.delete(id)
      deleted += 1
      continue
    }
    if (table === 'clients') {
      const local = await db.clients.get(id)
      const remote = rowToClient(row)
      if (!local || remote.updatedAt >= local.updatedAt) {
        await db.clients.put(remote)
        pulled += 1
      }
    } else if (table === 'workouts') {
      const local = await db.workouts.get(id)
      const remote = rowToWorkout(row)
      if (!local || remote.updatedAt >= local.updatedAt) {
        await db.workouts.put(remote)
        pulled += 1
      }
    } else {
      const local = await db.exercises.get(id)
      const remote = rowToExercise(row)
      if (!local || remote.updatedAt >= local.updatedAt) {
        await db.exercises.put(remote)
        pulled += 1
      }
    }
  }
  return { pulled, deleted }
}

/** Full sync: push local changes + tombstones, then pull remote. */
export async function runSync(session?: Session | null): Promise<SyncResult> {
  if (!isSupabaseConfigured()) {
    emit('unconfigured')
    throw new Error('Supabase не настроен: заполните VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY')
  }
  if (!navigator.onLine) {
    emit('offline')
    throw new Error('Нет сети')
  }
  const supabase = getSupabase()
  if (!supabase) {
    emit('unconfigured')
    throw new Error('Supabase не настроен')
  }

  if (syncing) return { pushed: 0, pulled: 0, deleted: 0 }
  syncing = true
  emit('syncing')

  try {
    let userId = session?.user.id
    if (!userId) {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      userId = data.session?.user.id
    }
    if (!userId) throw new Error('Войдите в аккаунт для синхронизации')

    const since = getLastSyncedAt()
    const syncStarted = Date.now()

    let pushed = 0
    pushed += await pushTombstones(supabase, userId)
    pushed += await pushTable(supabase, userId, 'clients', since)
    pushed += await pushTable(supabase, userId, 'workouts', since)
    pushed += await pushTable(supabase, userId, 'exercises', since)

    let pulled = 0
    let deleted = 0
    for (const table of ['clients', 'workouts', 'exercises'] as SyncEntity[]) {
      const res = await pullTable(supabase, table, since)
      pulled += res.pulled
      deleted += res.deleted
    }

    setLastSyncedAt(syncStarted)
    emit('ok')
    return { pushed, pulled, deleted }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка синхронизации'
    emit('error', message)
    throw err instanceof Error ? err : new Error(message)
  } finally {
    syncing = false
  }
}

/** Upload every local row (used on first login when cloud is empty). */
export async function pushAllLocal(session: Session): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase не настроен')
  const userId = session.user.id
  const clients = (await db.clients.toArray()).map((c) => clientToRow(c, userId))
  const workouts = (await db.workouts.toArray()).map((w) => workoutToRow(w, userId))
  const exercises = (await db.exercises.toArray()).map((e) => exerciseToRow(e, userId))
  if (clients.length) {
    const { error } = await supabase.from('clients').upsert(clients, { onConflict: 'id' })
    if (error) throw error
  }
  if (workouts.length) {
    const { error } = await supabase.from('workouts').upsert(workouts, { onConflict: 'id' })
    if (error) throw error
  }
  if (exercises.length) {
    const { error } = await supabase.from('exercises').upsert(exercises, { onConflict: 'id' })
    if (error) throw error
  }
  setLastSyncedAt(Date.now())
  return clients.length + workouts.length + exercises.length
}

export async function countRemoteRows(session: Session): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) return 0
  const userId = session.user.id
  let total = 0
  for (const table of ['clients', 'workouts', 'exercises'] as const) {
    const { count, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null)
    if (error) throw error
    total += count ?? 0
  }
  return total
}

/** Debounced sync after local writes. */
export function scheduleSync(delayMs = 1500) {
  if (!isSupabaseConfigured() || !navigator.onLine) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    void runSync().catch(() => {})
  }, delayMs)
}

export function startSyncAutopilot(getSession: () => Session | null) {
  const onOnline = () => {
    if (getSession()) void runSync(getSession()).catch(() => {})
  }
  window.addEventListener('online', onOnline)
  const interval = window.setInterval(() => {
    if (getSession() && navigator.onLine) void runSync(getSession()).catch(() => {})
  }, 5 * 60_000)
  return () => {
    window.removeEventListener('online', onOnline)
    window.clearInterval(interval)
  }
}

let hooksInstalled = false

/** Wire Dexie mutations to a debounced cloud sync. */
export function installSyncHooks() {
  if (hooksInstalled) return
  hooksInstalled = true
  const bump = () => scheduleSync()
  db.clients.hook('creating', bump)
  db.clients.hook('updating', bump)
  db.clients.hook('deleting', bump)
  db.workouts.hook('creating', bump)
  db.workouts.hook('updating', bump)
  db.workouts.hook('deleting', bump)
  db.exercises.hook('creating', bump)
  db.exercises.hook('updating', bump)
  db.exercises.hook('deleting', bump)
  db.tombstones.hook('creating', bump)
}

// silence unused helpers kept for potential ISO mapping
void msToIso
void rowUpdatedAt
