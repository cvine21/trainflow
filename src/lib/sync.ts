import type { Session, SupabaseClient } from '@supabase/supabase-js'
import type { EntityTable } from 'dexie'
import {
  db,
  legacyBlocks,
  type Client,
  type Exercise,
  type Measurement,
  type Metric,
  type SyncEntity,
  type Workout,
  type WorkoutStatus,
} from '@/lib/db'
import { normalizeLocalData } from '@/lib/migrations'
import { allExercises } from '@/lib/workouts'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

const LAST_SYNC_KEY = 'coach-journal:lastSyncedAt'
const SCHEMA_MIGRATION = 'supabase/migrations/20261101140000_blocks_time_measurements.sql'

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error' | 'offline' | 'unconfigured'

export interface SyncResult {
  pushed: number
  pulled: number
  deleted: number
}

type Listener = (status: SyncStatus, error?: string) => void
type Row = Record<string, unknown>

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

/** Missing table/column errors mean the Supabase schema predates the app. */
function check(error: { message: string; code?: string } | null): void {
  if (!error) return
  if (['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code ?? '')) {
    throw new Error(`Обновите схему Supabase: выполните ${SCHEMA_MIGRATION}`)
  }
  throw error instanceof Error ? error : new Error(error.message)
}

const num = (v: unknown) => (v == null ? null : Number(v))

interface Entity {
  name: SyncEntity
  push(supabase: SupabaseClient, userId: string, since: number): Promise<number>
  applyRemote(row: Row): Promise<'pulled' | 'deleted' | 'skipped'>
  fetchAll(supabase: SupabaseClient, userId: string): Promise<Row[]>
  /** Must run inside a transaction that includes the table. */
  replaceAll(rows: Row[]): Promise<void>
  stub(id: string, userId: string, deletedAt: number): Row
  table: EntityTable<{ id: string }, 'id'>
}

function defineEntity<T extends { id: string; updatedAt: number }>(spec: {
  name: SyncEntity
  table: EntityTable<T, 'id'>
  toRow: (item: T, userId: string) => Row
  fromRow: (row: Row) => T
  stub: (id: string) => Row
}): Entity {
  const { name, table, toRow, fromRow } = spec
  return {
    name,
    table: table as unknown as EntityTable<{ id: string }, 'id'>,
    async push(supabase, userId, since) {
      const rows = (await table.filter((x) => x.updatedAt > since).toArray()).map((x) => toRow(x, userId))
      if (!rows.length) return 0
      const { error } = await supabase.from(name).upsert(rows, { onConflict: 'id' })
      check(error)
      return rows.length
    },
    async applyRemote(row) {
      const id = String(row.id)
      const store = table as unknown as EntityTable<{ id: string }, 'id'>
      if (row.deleted_at) {
        await store.delete(id)
        await db.tombstones.delete(id)
        return 'deleted'
      }
      const remote = fromRow(row)
      const local = (await store.get(id)) as T | undefined
      if (local && remote.updatedAt < local.updatedAt) return 'skipped'
      await table.put(remote)
      return 'pulled'
    },
    async fetchAll(supabase, userId) {
      const { data, error } = await supabase.from(name).select('*').eq('user_id', userId).is('deleted_at', null)
      check(error)
      return (data ?? []) as Row[]
    },
    async replaceAll(rows) {
      await table.clear()
      if (rows.length) await table.bulkPut(rows.map(fromRow))
    },
    stub: (id, userId, deletedAt) => ({
      id,
      user_id: userId,
      created_at: deletedAt,
      ...spec.stub(id),
      updated_at: deletedAt,
      deleted_at: deletedAt,
    }),
  }
}

const clients = defineEntity<Client>({
  name: 'clients',
  table: db.clients,
  toRow: (c, userId) => ({
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
    deleted_at: null,
  }),
  fromRow: (row) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    phone: (row.phone as string) || undefined,
    birthDate: (row.birth_date as string) || undefined,
    heightCm: num(row.height_cm),
    weightKg: num(row.weight_kg),
    goal: (row.goal as string) || undefined,
    health: (row.health as string) || undefined,
    notes: (row.notes as string) || undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }),
  stub: () => ({ name: '(удалено)' }),
})

const workouts = defineEntity<Workout>({
  name: 'workouts',
  table: db.workouts,
  toRow: (w, userId) => ({
    id: w.id,
    user_id: userId,
    client_id: w.clientId,
    date: w.date,
    time: w.time || null,
    title: w.title,
    status: w.status,
    blocks: w.blocks,
    // Flat copy keeps older app versions readable.
    exercises: allExercises(w),
    notes: w.notes ?? null,
    created_at: w.createdAt,
    updated_at: w.updatedAt,
    deleted_at: null,
  }),
  fromRow: (row) => ({
    id: String(row.id),
    clientId: String(row.client_id),
    date: String(row.date),
    time: (row.time as string) || undefined,
    title: String(row.title ?? ''),
    status: row.status as WorkoutStatus,
    blocks: Array.isArray(row.blocks) ? (row.blocks as Workout['blocks']) : legacyBlocks(row.exercises),
    notes: (row.notes as string) || undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }),
  stub: () => ({ client_id: '', date: '1970-01-01', title: '', status: 'planned', exercises: [] }),
})

const exercises = defineEntity<Exercise>({
  name: 'exercises',
  table: db.exercises,
  toRow: (e, userId) => ({
    id: e.id,
    user_id: userId,
    name: e.name,
    category: e.category,
    metrics: e.metrics,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
    deleted_at: null,
  }),
  fromRow: (row) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    category: String(row.category ?? 'Другое'),
    metrics: (row.metrics as Metric[]) ?? [],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }),
  stub: () => ({ name: '(удалено)', category: 'Другое', metrics: [] }),
})

const measurements = defineEntity<Measurement>({
  name: 'measurements',
  table: db.measurements,
  toRow: (m, userId) => ({
    id: m.id,
    user_id: userId,
    client_id: m.clientId,
    date: m.date,
    weight_kg: m.weightKg ?? null,
    height_cm: m.heightCm ?? null,
    chest_cm: m.chestCm ?? null,
    waist_cm: m.waistCm ?? null,
    hips_cm: m.hipsCm ?? null,
    thigh_cm: m.thighCm ?? null,
    arm_cm: m.armCm ?? null,
    body_fat_pct: m.bodyFatPct ?? null,
    note: m.note ?? null,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
    deleted_at: null,
  }),
  fromRow: (row) => ({
    id: String(row.id),
    clientId: String(row.client_id),
    date: String(row.date),
    weightKg: num(row.weight_kg),
    heightCm: num(row.height_cm),
    chestCm: num(row.chest_cm),
    waistCm: num(row.waist_cm),
    hipsCm: num(row.hips_cm),
    thighCm: num(row.thigh_cm),
    armCm: num(row.arm_cm),
    bodyFatPct: num(row.body_fat_pct),
    note: (row.note as string) || undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }),
  stub: () => ({ client_id: '', date: '1970-01-01' }),
})

// Measurements go first: on an outdated schema the sync fails before anything is half-pushed.
const ENTITIES: Entity[] = [measurements, clients, workouts, exercises]
const BY_NAME = Object.fromEntries(ENTITIES.map((e) => [e.name, e])) as Record<SyncEntity, Entity>

async function pushTombstones(supabase: SupabaseClient, userId: string): Promise<number> {
  const stones = await db.tombstones.toArray()
  let pushed = 0
  for (const stone of stones) {
    const patch = { updated_at: stone.deletedAt, deleted_at: stone.deletedAt }
    const { data, error } = await supabase
      .from(stone.entity)
      .update(patch)
      .eq('id', stone.id)
      .eq('user_id', userId)
      .select('id')
    check(error)
    if (!data?.length) {
      // Never synced — insert a soft-deleted stub so other devices learn about the removal.
      const { error: upsertError } = await supabase
        .from(stone.entity)
        .upsert(BY_NAME[stone.entity].stub(stone.id, userId, stone.deletedAt), { onConflict: 'id' })
      check(upsertError)
    }
    await db.tombstones.delete(stone.id)
    pushed += 1
  }
  return pushed
}

async function pushPending(supabase: SupabaseClient, userId: string, since: number): Promise<number> {
  let pushed = await pushTombstones(supabase, userId)
  for (const e of ENTITIES) pushed += await e.push(supabase, userId, since)
  return pushed
}

async function pullEntity(supabase: SupabaseClient, e: Entity, since: number) {
  const { data, error } = await supabase.from(e.name).select('*').gt('updated_at', since)
  check(error)
  let pulled = 0
  let deleted = 0
  for (const row of (data ?? []) as Row[]) {
    const res = await e.applyRemote(row)
    if (res === 'pulled') pulled += 1
    if (res === 'deleted') deleted += 1
  }
  return { pulled, deleted }
}

async function resolveUserId(supabase: SupabaseClient, session?: Session | null): Promise<string> {
  let userId = session?.user.id
  if (!userId) {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    userId = data.session?.user.id
  }
  if (!userId) throw new Error('Войдите в аккаунт для синхронизации')
  return userId
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
    const userId = await resolveUserId(supabase, session)
    const since = getLastSyncedAt()
    const syncStarted = Date.now()

    const pushed = await pushPending(supabase, userId, since)
    let pulled = 0
    let deleted = 0
    for (const e of ENTITIES) {
      const res = await pullEntity(supabase, e, since)
      pulled += res.pulled
      deleted += res.deleted
    }

    setLastSyncedAt(syncStarted)
    if (pulled) await normalizeLocalData()
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

/** Drop local user data so the UI cannot show stale IndexedDB data. */
export async function clearLocalUserData(): Promise<void> {
  await db.transaction('rw', db.clients, db.workouts, db.measurements, db.tombstones, async () => {
    await db.clients.clear()
    await db.workouts.clear()
    await db.measurements.clear()
    await db.tombstones.clear()
  })
  clearSyncMeta()
}

/**
 * Supabase is the single source of truth when the user is signed in.
 * Local edits made since the last sync (e.g. offline at the gym) are pushed first,
 * then local data is replaced with the cloud snapshot (empty cloud → empty app).
 */
export async function hydrateFromRemote(
  session: Session,
): Promise<{ clients: number; workouts: number; exercises: number; measurements: number }> {
  if (!navigator.onLine) throw new Error('Нет сети')
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase не настроен')

  const empty = { clients: 0, workouts: 0, exercises: 0, measurements: 0 }
  if (syncing) return empty
  syncing = true
  emit('syncing')

  try {
    const userId = session.user.id
    const since = getLastSyncedAt()
    if (since > 0) await pushPending(supabase, userId, since)

    const snapshot = await Promise.all(ENTITIES.map((e) => e.fetchAll(supabase, userId)))
    const counts = { ...empty }
    await db.transaction('rw', [db.tombstones, ...ENTITIES.map((e) => e.table)], async () => {
      await db.tombstones.clear()
      for (const [i, e] of ENTITIES.entries()) {
        const rows = snapshot[i] ?? []
        counts[e.name] = rows.length
        // Exercise library: cloud wins when it has rows; otherwise keep local defaults.
        if (e.name === 'exercises' && !rows.length) continue
        await e.replaceAll(rows)
      }
    })

    setLastSyncedAt(Date.now())
    await normalizeLocalData()
    emit('ok')
    return counts
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки из облака'
    emit('error', message)
    throw err instanceof Error ? err : new Error(message)
  } finally {
    syncing = false
  }
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
  for (const e of ENTITIES) {
    e.table.hook('creating', bump)
    e.table.hook('updating', bump)
    e.table.hook('deleting', bump)
  }
  db.tombstones.hook('creating', bump)
}
