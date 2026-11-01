import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Check,
  CheckCircle2,
  Copy,
  FileQuestion,
  MoreVertical,
  Pencil,
  RotateCcw,
  Timer,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { db, deleteWorkout, type Workout, type WorkoutExercise, type WorkoutSet } from '@/lib/db'
import { formatDateLong, formatDuration, formatNumber, plural } from '@/lib/format'
import {
  duplicateWorkout,
  formatSet,
  METRIC_LABELS,
  sortMetrics,
  workoutSetCount,
  workoutTonnage,
} from '@/lib/workouts'
import { NumberCell, PLACEHOLDER, SET_FIELD } from '@/components/ExerciseEditor'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function WorkoutPage() {
  const { workoutId = '' } = useParams()
  const navigate = useNavigate()
  const workout = useLiveQuery(async () => (await db.workouts.get(workoutId)) ?? null, [workoutId])
  const client = useLiveQuery(
    async () => (workout ? ((await db.clients.get(workout.clientId)) ?? null) : undefined),
    [workout?.clientId],
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingSetId, setEditingSetId] = useState<string | null>(null)

  if (workout === null) {
    return (
      <>
        <PageHeader title="Тренировка" backTo="/workouts" />
        <EmptyState
          icon={FileQuestion}
          title="Тренировка не найдена"
          description="Возможно, она была удалена."
          action={
            <Link to="/" className={buttonVariants({ variant: 'outline' })}>
              К клиентам
            </Link>
          }
        />
      </>
    )
  }

  if (!workout) {
    return (
      <>
        <PageHeader title={<Skeleton className="h-5 w-40" />} backTo="/" />
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </>
    )
  }

  const backTo = `/clients/${workout.clientId}?tab=${workout.status === 'completed' ? 'history' : 'plan'}`
  const tonnage = workoutTonnage(workout)
  const totalSets = workoutSetCount(workout)
  const isPlanned = workout.status === 'planned'

  async function repeat() {
    if (!workout) return
    const id = await duplicateWorkout(workout)
    toast.success('Создана копия в плане — проверьте дату и веса')
    navigate(`/workouts/${id}/edit`)
  }

  return (
    <>
      <PageHeader
        title={workout.title || 'Тренировка'}
        subtitle={client?.name}
        backTo={backTo}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" aria-label="Действия" />}>
              <MoreVertical className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="h-10" onClick={() => navigate(`/workouts/${workout.id}/edit`)}>
                <Pencil /> Редактировать
              </DropdownMenuItem>
              <DropdownMenuItem className="h-10" onClick={repeat}>
                <Copy /> Повторить тренировку
              </DropdownMenuItem>
              {!isPlanned && (
                <DropdownMenuItem className="h-10" onClick={() => setStatus(workout, 'planned')}>
                  <RotateCcw /> Вернуть в план
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="h-10" variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="flex flex-col gap-3 px-4 pt-4 pb-6">
        <section className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium first-letter:uppercase">{formatDateLong(workout.date)}</p>
            <StatusBadge status={workout.status} date={workout.date} />
          </div>
          {client && (
            <Link to={`/clients/${client.id}`} className="mt-0.5 inline-block text-sm text-primary">
              {client.name}
            </Link>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <StatTile
              value={workout.exercises.length}
              label={plural(workout.exercises.length, ['упражнение', 'упражнения', 'упражнений'])}
            />
            <StatTile value={totalSets} label={plural(totalSets, ['подход', 'подхода', 'подходов'])} />
            <StatTile value={tonnage > 0 ? formatNumber(tonnage) : '—'} label="кг тоннаж" />
          </div>
        </section>

        {workout.exercises.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            В тренировке пока нет упражнений.{' '}
            <Link to={`/workouts/${workout.id}/edit`} className="font-medium text-primary">
              Добавить
            </Link>
          </div>
        )}

        {workout.exercises.map((ex, i) => (
          <section key={ex.id} className="rounded-2xl border border-border/70 bg-card">
            <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {i + 1}
              </span>
              <h3 className="min-w-0 flex-1 font-semibold">{ex.name}</h3>
              {ex.restSec != null && ex.restSec > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Timer className="size-3.5" /> {formatDuration(ex.restSec)}
                </span>
              )}
            </div>
            <ul className="px-2 pb-2">
              {ex.sets.map((s, j) => (
                <li key={s.id}>
                  {editingSetId === s.id ? (
                    <SetEditForm
                      exercise={ex}
                      set={s}
                      index={j}
                      onCancel={() => setEditingSetId(null)}
                      onSave={async (next) => {
                        await saveSet(workout.id, ex.id, next)
                        setEditingSetId(null)
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-1 rounded-xl pl-2 active:bg-muted">
                      <button
                        type="button"
                        onClick={() => setEditingSetId(s.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left"
                      >
                        <span className="w-14 shrink-0 text-xs text-muted-foreground">Подход {j + 1}</span>
                        <span className="flex-1 text-sm font-medium tabular-nums">{formatSet(s, ex.metrics)}</span>
                        <Pencil className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSet(workout.id, ex.id, s, j)}
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-destructive/10 active:text-destructive"
                        aria-label={`Удалить подход ${j + 1}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
              {ex.sets.length === 0 && <li className="px-2 py-2 text-sm text-muted-foreground">Подходы не указаны</li>}
            </ul>
            {ex.note && (
              <p className="mx-4 mb-3 rounded-xl bg-muted/70 px-3 py-2 text-sm whitespace-pre-wrap text-muted-foreground">
                {ex.note}
              </p>
            )}
          </section>
        ))}

        <NotesEditor key={workout.id} workoutId={workout.id} initial={workout.notes ?? ''} />
      </div>

      <div className="pb-safe sticky bottom-0 mt-auto flex gap-2 border-t border-border/60 bg-background/90 px-4 pt-3 backdrop-blur-md">
        <Link
          to={`/workouts/${workout.id}/edit`}
          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'mb-3 h-12 flex-1 text-base')}
        >
          <Pencil /> Изменить
        </Link>
        {isPlanned ? (
          <Button className="mb-3 h-12 flex-[1.4] text-base" onClick={() => setStatus(workout, 'completed')}>
            <CheckCircle2 /> Провести
          </Button>
        ) : (
          <Button className="mb-3 h-12 flex-[1.4] text-base" onClick={repeat}>
            <Copy /> Повторить
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Удалить тренировку?"
        description="Тренировка и заметки к ней будут удалены без возможности восстановления."
        onConfirm={async () => {
          await deleteWorkout(workout.id)
          toast.success('Тренировка удалена')
          navigate(backTo, { replace: true })
        }}
      />
    </>
  )
}

// Reads the workout inside the transaction: the rendered copy may lag behind a just-saved edit.
function updateSets(workoutId: string, exerciseId: string, fn: (sets: WorkoutSet[]) => WorkoutSet[]) {
  return db.transaction('rw', db.workouts, async () => {
    const workout = await db.workouts.get(workoutId)
    if (!workout) return
    const exercises = workout.exercises.map((ex) => (ex.id !== exerciseId ? ex : { ...ex, sets: fn(ex.sets) }))
    await db.workouts.update(workoutId, { exercises, updatedAt: Date.now() })
  })
}

async function saveSet(workoutId: string, exerciseId: string, set: WorkoutSet) {
  await updateSets(workoutId, exerciseId, (sets) => sets.map((s) => (s.id === set.id ? set : s)))
}

async function removeSet(workoutId: string, exerciseId: string, set: WorkoutSet, index: number) {
  await updateSets(workoutId, exerciseId, (sets) => sets.filter((s) => s.id !== set.id))
  toast('Подход удалён', {
    action: {
      label: 'Вернуть',
      onClick: () => updateSets(workoutId, exerciseId, (sets) => [...sets.slice(0, index), set, ...sets.slice(index)]),
    },
  })
}

function SetEditForm({
  exercise,
  set,
  index,
  onSave,
  onCancel,
}: {
  exercise: WorkoutExercise
  set: WorkoutSet
  index: number
  onSave: (set: WorkoutSet) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(set)
  const metrics = sortMetrics(exercise.metrics)

  return (
    <form
      className="flex items-center gap-1.5 rounded-xl bg-muted/60 py-1.5 pl-2"
      onSubmit={(e) => {
        e.preventDefault()
        onSave(draft)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
    >
      <span className="w-14 shrink-0 text-xs text-muted-foreground">Подход {index + 1}</span>
      <div
        className="grid min-w-0 flex-1 gap-1.5"
        style={{ gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))` }}
      >
        {metrics.map((m, k) => (
          <NumberCell
            key={m}
            value={(draft[SET_FIELD[m]] as number | null | undefined) ?? null}
            onChange={(v) => setDraft((d) => ({ ...d, [SET_FIELD[m]]: v }))}
            placeholder={PLACEHOLDER[m]}
            decimal={m === 'weight' || m === 'distance'}
            duration={m === 'time'}
            autoFocus={k === 0}
            label={`${METRIC_LABELS[m].full}, подход ${index + 1}`}
          />
        ))}
      </div>
      <button
        type="submit"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        aria-label="Сохранить подход"
      >
        <Check className="size-4" strokeWidth={3} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
        aria-label="Отменить"
      >
        <X className="size-4" />
      </button>
    </form>
  )
}

async function setStatus(workout: Workout, status: Workout['status']) {
  await db.workouts.update(workout.id, { status, updatedAt: Date.now() })
  toast.success(status === 'completed' ? 'Тренировка перенесена в историю' : 'Тренировка возвращена в план')
}

function StatTile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-xl bg-muted/60 py-2">
      <div className="text-lg leading-6 font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  )
}

function NotesEditor({ workoutId, initial }: { workoutId: string; initial: string }) {
  const [value, setValue] = useState(initial)
  const [state, setState] = useState<'idle' | 'pending' | 'saved'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latest = useRef(value)

  useEffect(() => {
    latest.current = value
  }, [value])

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current)
        void db.workouts.update(workoutId, { notes: latest.current, updatedAt: Date.now() })
      }
    },
    [workoutId],
  )

  function schedule(next: string) {
    setValue(next)
    setState('pending')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      timer.current = undefined
      await db.workouts.update(workoutId, { notes: next, updatedAt: Date.now() })
      setState('saved')
    }, 600)
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Заметки тренера</h3>
        <span className="text-xs text-muted-foreground">
          {state === 'pending' ? 'Сохраняем…' : state === 'saved' ? 'Сохранено' : ''}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => schedule(e.target.value)}
        placeholder="Как прошла тренировка: самочувствие, техника, что поменять в следующий раз"
        rows={4}
        className="bg-background"
      />
    </section>
  )
}
