import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowUp, History, MessageSquarePlus, MoreVertical, Plus, Timer, Trash2, X } from 'lucide-react'
import type { Metric, WorkoutExercise, WorkoutSet } from '@/lib/db'
import { formatDate, formatNumber, parseDuration, parseNumber } from '@/lib/format'
import { uid } from '@/lib/id'
import { emptySet, findLastPerformance, METRIC_LABELS, METRIC_ORDER, sortMetrics, summarizeSets } from '@/lib/workouts'
import { Chip } from '@/components/ExercisePicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ExerciseEditorProps {
  exercise: WorkoutExercise
  index: number
  total: number
  clientId: string
  workoutId?: string
  onChange: (exercise: WorkoutExercise) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
}

export const SET_FIELD: Record<Metric, keyof WorkoutSet> = {
  reps: 'reps',
  weight: 'weight',
  time: 'timeSec',
  distance: 'distance',
}

export const PLACEHOLDER: Record<Metric, string> = {
  reps: 'повт',
  weight: 'кг',
  time: 'сек',
  distance: 'м',
}

export function ExerciseEditor({
  exercise,
  index,
  total,
  clientId,
  workoutId,
  onChange,
  onRemove,
  onMove,
}: ExerciseEditorProps) {
  const [showNote, setShowNote] = useState(Boolean(exercise.note))
  const metrics = sortMetrics(exercise.metrics)
  const last = useLiveQuery(
    () => (exercise.name.trim() ? findLastPerformance(clientId, exercise.name, workoutId) : null),
    [clientId, exercise.name, workoutId],
  )

  const update = (patch: Partial<WorkoutExercise>) => onChange({ ...exercise, ...patch })

  const updateSet = (setId: string, field: keyof WorkoutSet, value: number | null) =>
    update({ sets: exercise.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)) })

  const addSet = () => {
    const prev = exercise.sets.at(-1)
    update({ sets: [...exercise.sets, prev ? { ...prev, id: uid(), done: false } : emptySet()] })
  }

  const removeSet = (setId: string) => update({ sets: exercise.sets.filter((s) => s.id !== setId) })

  const toggleMetric = (m: Metric) => {
    const has = metrics.includes(m)
    if (has && metrics.length === 1) return
    update({ metrics: sortMetrics(has ? metrics.filter((x) => x !== m) : [...metrics, m]) })
  }

  const applyLast = () => {
    if (!last) return
    update({
      metrics: sortMetrics(last.exercise.metrics),
      sets: last.exercise.sets.map((s) => ({ ...s, id: uid(), done: false })),
    })
  }

  const gridCols = { gridTemplateColumns: `1.5rem repeat(${metrics.length}, minmax(0, 1fr)) 2rem` }

  return (
    <section className="rounded-2xl border border-border/70 bg-card">
      <div className="flex items-center gap-2 py-2 pr-1.5 pl-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
          {index + 1}
        </span>
        <Input
          value={exercise.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Название упражнения"
          className="h-9 min-w-0 flex-1 border-transparent bg-transparent px-1.5 text-base font-semibold shadow-none focus-visible:border-ring"
          aria-label="Название упражнения"
        />
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" aria-label="Действия с упражнением" />}>
            <MoreVertical className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="h-10" disabled={index === 0} onClick={() => onMove(-1)}>
              <ArrowUp /> Переместить выше
            </DropdownMenuItem>
            <DropdownMenuItem className="h-10" disabled={index === total - 1} onClick={() => onMove(1)}>
              <ArrowDown /> Переместить ниже
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="h-10" variant="destructive" onClick={onRemove}>
              <Trash2 /> Удалить упражнение
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {last && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl bg-muted/70 px-3 py-2 text-xs">
          <History className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            <span className="lowercase">{formatDate(last.date, { weekday: false })}</span>:{' '}
            <span className="text-foreground">{summarizeSets(last.exercise)}</span>
          </span>
          <button type="button" onClick={applyLast} className="shrink-0 font-medium text-primary">
            Повторить
          </button>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
        {METRIC_ORDER.map((m) => (
          <Chip key={m} active={metrics.includes(m)} onClick={() => toggleMetric(m)} className="h-7 px-2.5 text-xs">
            {METRIC_LABELS[m].full}
          </Chip>
        ))}
      </div>

      <div className="px-3">
        {exercise.sets.length > 0 && (
          <div
            className="grid items-center gap-1.5 pb-1 text-[11px] font-medium text-muted-foreground"
            style={gridCols}
          >
            <span className="text-center">#</span>
            {metrics.map((m) => (
              <span key={m} className="text-center">
                {METRIC_LABELS[m].short}
              </span>
            ))}
            <span />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          {exercise.sets.map((s, i) => (
            <div key={s.id} className="grid items-center gap-1.5" style={gridCols}>
              <span className="text-center text-sm font-medium text-muted-foreground tabular-nums">{i + 1}</span>
              {metrics.map((m) => (
                <NumberCell
                  key={m}
                  value={(s[SET_FIELD[m]] as number | null | undefined) ?? null}
                  onChange={(v) => updateSet(s.id, SET_FIELD[m], v)}
                  placeholder={PLACEHOLDER[m]}
                  decimal={m === 'weight' || m === 'distance'}
                  duration={m === 'time'}
                  label={`${METRIC_LABELS[m].full}, подход ${i + 1}`}
                />
              ))}
              <button
                type="button"
                onClick={() => removeSet(s.id)}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
                aria-label={`Удалить подход ${i + 1}`}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
        {exercise.sets.length === 0 && <p className="py-2 text-center text-sm text-muted-foreground">Подходов нет</p>}
      </div>

      <div className="flex items-center gap-2 px-3 pt-2 pb-3">
        <Button type="button" variant="secondary" className="h-9 flex-1" onClick={addSet}>
          <Plus /> Подход
        </Button>
        <label className="flex h-9 items-center gap-1 rounded-lg border border-input px-2 text-sm text-muted-foreground">
          <Timer className="size-4 shrink-0" />
          <span className="sr-only">Отдых между подходами, секунд</span>
          <NumberCell
            value={exercise.restSec ?? null}
            onChange={(v) => update({ restSec: v })}
            placeholder="отдых"
            duration
            bare
            label="Отдых, секунд"
          />
          <span className="text-xs">с</span>
        </label>
        {!showNote && (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            onClick={() => setShowNote(true)}
            aria-label="Добавить комментарий"
          >
            <MessageSquarePlus className="size-5" />
          </Button>
        )}
      </div>

      {showNote && (
        <div className="px-3 pb-3">
          <Textarea
            value={exercise.note ?? ''}
            onChange={(e) => update({ note: e.target.value })}
            placeholder="Техника, акценты, темп, ощущения клиента…"
            rows={2}
            className="min-h-12"
          />
        </div>
      )}
    </section>
  )
}

function toText(value: number | null): string {
  return value == null ? '' : formatNumber(value).replace(/\s/g, '')
}

export function NumberCell({
  value,
  onChange,
  placeholder,
  decimal,
  duration,
  bare,
  autoFocus,
  label,
}: {
  value: number | null
  onChange: (value: number | null) => void
  placeholder?: string
  decimal?: boolean
  duration?: boolean
  bare?: boolean
  autoFocus?: boolean
  label: string
}) {
  const parse = duration ? parseDuration : parseNumber
  const [text, setText] = useState(() => toText(value))

  useEffect(() => {
    if (parse(text) !== value) setText(toText(value))
    // Only external changes (e.g. "Повторить") should overwrite what the user is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={text}
      placeholder={placeholder}
      aria-label={label}
      autoFocus={autoFocus}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        setText(e.target.value)
        onChange(parse(e.target.value))
      }}
      className={
        bare
          ? 'w-12 bg-transparent text-center text-base text-foreground outline-none placeholder:text-muted-foreground/70'
          : 'h-10 w-full min-w-0 rounded-lg border border-input bg-background text-center text-base tabular-nums outline-none placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40'
      }
    />
  )
}
