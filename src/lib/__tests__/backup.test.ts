import { describe, expect, it } from 'vitest'

/** Mirrors the structural checks in importBackup without touching IndexedDB. */
function validateBackup(raw: unknown): { ok: true } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'Файл повреждён или это не JSON' }
  const data = raw as { app?: string; clients?: unknown; workouts?: unknown }
  if (data.app !== 'coach-journal' || !Array.isArray(data.clients) || !Array.isArray(data.workouts)) {
    return { ok: false, error: 'Это не резервная копия журнала тренера' }
  }
  return { ok: true }
}

describe('backup shape', () => {
  it('accepts a v2 coach-journal file', () => {
    expect(
      validateBackup({
        app: 'coach-journal',
        version: 2,
        clients: [],
        workouts: [],
        exercises: [],
        measurements: [],
      }),
    ).toEqual({ ok: true })
  })

  it('rejects foreign or incomplete files', () => {
    expect(validateBackup({ app: 'other', clients: [], workouts: [] }).ok).toBe(false)
    expect(validateBackup({ app: 'coach-journal', clients: [] }).ok).toBe(false)
    expect(validateBackup(null).ok).toBe(false)
  })
})
