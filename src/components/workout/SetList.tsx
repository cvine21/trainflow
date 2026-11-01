import { useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import type { Metric, WorkoutSet } from '@/lib/db'
import { plural } from '@/lib/format'
import { uid } from '@/lib/id'
import { emptySet, formatSet, formatSetGroup, getSetValue, groupSets, SET_FIELD, sortMetrics } from '@/lib/workouts'
import { BandStepper, MetricStepper } from '@/components/workout/Stepper'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
    <div className="flex flex-col gap-1">
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
            {single && <span className="shrink-0 text-xs text-muted-foreground">{single}</span>}
            <span className={cn('min-w-0 flex-1 text-sm font-medium tabular-nums', empty && 'text-muted-foreground')}>
              {summary}
            </span>
          </>
        )

        if (!editable)
          return (
            <div key={first.id} className="flex items-center gap-3 px-2 py-2">
              {content}
            </div>
          )

        return (
          <div key={first.id} className={cn('rounded-xl border', row.open ? 'border-border/70' : 'border-transparent')}>
            <button
              type="button"
              onClick={() => setOpenIds(row.open ? [] : ids)}
              aria-expanded={row.open}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-2 text-left active:bg-muted"
            >
              {content}
              <ChevronDown
                className={cn('size-4 shrink-0 text-muted-foreground transition-transform', row.open && 'rotate-180')}
              />
            </button>
            {row.open && (
              <div className="flex flex-col gap-3 px-2 pt-1 pb-2">
                {row.sets.map((s) => {
                  const index = sets.findIndex((x) => x.id === s.id)
                  return (
                    <div key={s.id} className="flex flex-col gap-2.5 rounded-xl bg-muted/50 p-2.5">
                      {!single && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-muted-foreground">Подход {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeSet(s.id)}
                            className="flex size-8 items-center justify-center rounded-full text-muted-foreground active:bg-background"
                            aria-label={`Удалить подход ${index + 1}`}
                          >
                            <Trash2 className="size-4" />
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
        <div className="px-1.5 pt-0.5 pb-1.5">
          <Button type="button" variant="secondary" className="h-10 w-full" onClick={addSet}>
            <Plus /> Подход
          </Button>
        </div>
      )}
    </div>
  )
}
