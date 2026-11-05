import { Button } from '@/components/Button'
import { NumberInput } from '@/components/Workout/NumberInput'
import type { Metric, WorkoutSet } from '@/lib/db'
import { plural } from '@/lib/format'
import { uid } from '@/lib/id'
import {
  BAND_COLORS,
  BAND_LEVELS,
  emptySet,
  formatSet,
  formatSetGroup,
  getSetValue,
  groupSets,
  METRIC_LABELS,
  SET_FIELD,
  sortMetrics,
} from '@/lib/workouts'
import clsx from 'clsx'
import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import styles from './SetList.module.css'

const setsWord = (n: number) => `${n} ${plural(n, ['подход', 'подхода', 'подходов'])}`

/** More metrics than this wrap onto a second line inside the set row. */
const MAX_COLS = 3

const HEADERS: Record<Metric, string> = {
  reps: 'Повт.',
  weight: 'Вес, кг',
  band: 'Резина',
  time: 'Время',
  distance: 'Дист., м',
  calories: 'Кал',
}

type SetUpdate = (update: (set: WorkoutSet) => WorkoutSet) => void

function BandSelect({
  value,
  label,
  autoFocus,
  onChange,
}: {
  value: string | null
  label: string
  autoFocus?: boolean
  onChange: (value: string | null) => void
}) {
  return (
    <div className={styles.band}>
      {value && <span className={styles.swatch} style={{ background: BAND_COLORS[value] }} />}
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        aria-label={label}
        autoFocus={autoFocus}
        className={clsx(styles.select, value && styles.selectWithSwatch)}
      >
        <option value="">—</option>
        {BAND_LEVELS.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
    </div>
  )
}

function Field({
  metric,
  set,
  label,
  caption,
  autoFocus,
  onUpdate,
}: {
  metric: Metric
  set: WorkoutSet
  label: string
  caption?: string
  autoFocus?: boolean
  onUpdate: SetUpdate
}) {
  return (
    <div className={styles.cell}>
      {caption && <span className={styles.caption}>{caption}</span>}
      {metric === 'band' ? (
        <BandSelect
          value={set.band ?? null}
          label={label}
          autoFocus={autoFocus}
          onChange={(band) => onUpdate((s) => ({ ...s, band }))}
        />
      ) : (
        <NumberInput
          value={getSetValue(set, metric)}
          onChange={(v) => onUpdate((s) => ({ ...s, [SET_FIELD[metric]]: v }))}
          decimal={metric === 'weight' || metric === 'distance'}
          duration={metric === 'time'}
          placeholder={metric === 'time' ? '0:00' : '—'}
          label={label}
          autoFocus={autoFocus}
          className={styles.input}
        />
      )}
    </div>
  )
}

function summarize(group: WorkoutSet[], metrics: Metric[], single?: string): string {
  if (group.every((s) => formatSet(s, metrics) === '—')) {
    return single ? 'Не задано' : `${setsWord(group.length)} без значений`
  }
  return single ? formatSet(group[0]!, metrics) : formatSetGroup(group, metrics)
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
  // Inputs stay hidden until the pencil of a set is pressed; one set is edited at a time.
  const [editingId, setEditingId] = useState<string | null>(null)
  const sorted = sortMetrics(metrics)

  if (!editable) {
    return (
      <div className={styles.list}>
        {groupSets(sets, sorted).map((group) => {
          const empty = group.every((s) => formatSet(s, sorted) === '—')
          return (
            <div key={group[0]!.id} className={styles.readonlyRow}>
              {single && <span className={styles.singleLabel}>{single}</span>}
              <span className={clsx(styles.summary, empty && styles.summaryMuted)}>
                {summarize(group, sorted, single)}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  // 4 metrics read better as 2 + 2 than as 3 + 1.
  const cols = sorted.length <= MAX_COLS ? sorted.length : sorted.length === 4 ? 2 : MAX_COLS
  const style = { '--cols': cols } as CSSProperties

  const updateSet = (id: string, update: (set: WorkoutSet) => WorkoutSet) =>
    onChange(sets.map((s) => (s.id === id ? update(s) : s)))

  const removeSet = (id: string) => {
    if (editingId === id) setEditingId(null)
    onChange(sets.filter((s) => s.id !== id))
  }

  const addSet = () => {
    const prev = sets.at(-1)
    const set = prev ? { ...prev, id: uid() } : emptySet()
    onChange([...sets, set])
    setEditingId(set.id)
  }

  return (
    <div className={styles.list} style={style}>
      {sets.length > 0 && (
        <div className={styles.rows}>
          {single && <span className={styles.singleLabel}>{single}</span>}
          {sets.map((s, i) => {
            const editing = s.id === editingId
            const n = i + 1
            const text = formatSet(s, sorted)
            return (
              <div
                key={s.id}
                className={clsx(styles.row, single && styles.rowSingle, editing && styles.rowEditing)}
              >
                {!single && <span className={styles.index}>{n}</span>}
                {editing ? (
                  <>
                    <div className={styles.fields}>
                      {sorted.map((m, mi) => (
                        <Field
                          key={m}
                          metric={m}
                          set={s}
                          label={single ? METRIC_LABELS[m].full : `${METRIC_LABELS[m].full}, подход ${n}`}
                          caption={HEADERS[m]}
                          autoFocus={mi === 0}
                          onUpdate={(update) => updateSet(s.id, update)}
                        />
                      ))}
                    </div>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className={clsx(styles.iconButton, styles.done)}
                        aria-label={single ? 'Готово' : `Готово, подход ${n}`}
                      >
                        <Check className={styles.icon} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className={clsx(styles.summary, text === '—' && styles.summaryMuted)}>
                      {text === '—' ? 'Не задано' : text}
                    </span>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        onClick={() => setEditingId(s.id)}
                        className={styles.iconButton}
                        aria-label={single ? 'Изменить' : `Изменить подход ${n}`}
                      >
                        <Pencil className={styles.icon} />
                      </button>
                      {!single && (
                        <button
                          type="button"
                          onClick={() => removeSet(s.id)}
                          className={styles.iconButton}
                          aria-label={`Удалить подход ${n}`}
                        >
                          <Trash2 className={styles.icon} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
      {!single && (
        <div className={styles.addWrap}>
          <Button type="button" variant="secondary" className={styles.addSet} onClick={addSet}>
            <Plus /> Подход
          </Button>
        </div>
      )}
    </div>
  )
}
