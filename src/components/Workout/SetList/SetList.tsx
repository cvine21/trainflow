import { Button } from '@/components/Button'
import { BandStepper, MetricStepper } from '@/components/Workout/Stepper'
import type { Metric, WorkoutSet } from '@/lib/db'
import { plural } from '@/lib/format'
import { uid } from '@/lib/id'
import { emptySet, formatSet, formatSetGroup, getSetValue, groupSets, SET_FIELD, sortMetrics } from '@/lib/workouts'
import clsx from 'clsx'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import styles from './SetList.module.css'

const setsWord = (n: number) => `${n} ${plural(n, ['подход', 'подхода', 'подходов'])}`

interface Row {
  sets: WorkoutSet[]
  open: boolean
}

/** Collapsed rows stay grouped; an open panel keeps its set ids even when values diverge. */
function rowsFor(sets: WorkoutSet[], metrics: Metric[], openIds: string[]): Row[] {
  if (!openIds.length) return groupSets(sets, metrics).map((g) => ({ sets: g, open: false }))

  const openSets = sets.filter((s) => openIds.includes(s.id))
  const rows: Row[] = []
  let i = 0
  let openEmitted = false
  while (i < sets.length) {
    if (openIds.includes(sets[i]!.id)) {
      if (!openEmitted && openSets.length) {
        rows.push({ sets: openSets, open: true })
        openEmitted = true
      }
      i++
      continue
    }
    let j = i
    while (j < sets.length && !openIds.includes(sets[j]!.id)) j++
    for (const g of groupSets(sets.slice(i, j), metrics)) rows.push({ sets: g, open: false })
    i = j
  }
  return rows
}

interface SetListProps {
  sets: WorkoutSet[]
  metrics: Metric[]
  /** Circuit prescription label, e.g. "За раунд": one row, no set count. */
  single?: string
  editable: boolean
  onChange: (sets: WorkoutSet[]) => void
}

export function SetList({ sets, metrics, single, editable, onChange }: SetListProps) {
  const [openIds, setOpenIds] = useState<string[]>([])
  const open = openIds.filter((id) => sets.some((s) => s.id === id))
  const sorted = sortMetrics(metrics)
  const rows = rowsFor(sets, sorted, open)

  const updateSet = (id: string, update: (set: WorkoutSet) => WorkoutSet) =>
    onChange(sets.map((s) => (s.id === id ? update(s) : s)))

  const removeSet = (id: string) => {
    onChange(sets.filter((s) => s.id !== id))
    setOpenIds((ids) => ids.filter((x) => x !== id))
  }

  const addSet = () => {
    const prev = sets.at(-1)
    const set = prev ? { ...prev, id: uid() } : emptySet()
    onChange([...sets, set])
    setOpenIds([set.id])
  }

  return (
    <div className={styles.list}>
      {rows.map((row) => {
        const first = row.sets[0]!
        const ids = row.sets.map((s) => s.id)
        const empty = row.sets.every((s) => formatSet(s, sorted) === '—')
        const formatted = row.sets.map((s) => formatSet(s, sorted))
        const allSame = formatted.every((f) => f === formatted[0])
        const summary = empty
          ? single
            ? 'Не задано'
            : `${setsWord(row.sets.length)} без значений`
          : single
            ? formatted[0]!
            : allSame
              ? formatSetGroup(row.sets, sorted)
              : formatted.join(', ')
        const content = (
          <>
            {single && <span className={styles.singleLabel}>{single}</span>}
            <span className={clsx(styles.summary, empty && styles.summaryMuted)}>{summary}</span>
          </>
        )

        if (!editable)
          return (
            <div key={first.id} className={styles.readonlyRow}>
              {content}
            </div>
          )

        return (
          <div key={first.id} className={clsx(styles.row, row.open && styles.rowOpen)}>
            <button
              type="button"
              onClick={() => setOpenIds(row.open ? [] : ids)}
              aria-expanded={row.open}
              className={styles.toggle}
            >
              {content}
              <ChevronDown className={clsx(styles.chevron, row.open && styles.chevronOpen)} />
            </button>
            {row.open && (
              <div className={styles.panel}>
                {row.sets.map((s) => {
                  const index = sets.findIndex((x) => x.id === s.id)
                  return (
                    <div key={s.id} className={styles.setCard}>
                      {!single && (
                        <div className={styles.setHeader}>
                          <span className={styles.setLabel}>Подход {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeSet(s.id)}
                            className={styles.remove}
                            aria-label={`Удалить подход ${index + 1}`}
                          >
                            <Trash2 className={styles.icon} />
                          </button>
                        </div>
                      )}
                      {sorted.map((m) =>
                        m === 'band' ? (
                          <BandStepper
                            key={m}
                            value={s.band ?? null}
                            onChange={(band) => updateSet(s.id, (set) => ({ ...set, band }))}
                          />
                        ) : (
                          <MetricStepper
                            key={m}
                            metric={m}
                            value={getSetValue(s, m)}
                            onChange={(v) => updateSet(s.id, (set) => ({ ...set, [SET_FIELD[m]]: v }))}
                          />
                        ),
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      {editable && !single && (
        <div className={styles.addWrap}>
          <Button type="button" variant="secondary" className={styles.addSet} onClick={addSet}>
            <Plus /> Подход
          </Button>
        </div>
      )}
    </div>
  )
}
