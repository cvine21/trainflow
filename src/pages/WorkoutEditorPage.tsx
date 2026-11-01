import { useRef, useState } from 'react'
import { useBeforeUnload, useBlocker, useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, CheckCircle2, Clock, Dumbbell, FileQuestion, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  db,
  ensureExerciseInLibrary,
  type Client,
  type Metric,
  type Workout,
  type WorkoutExercise,
  type WorkoutStatus,
} from '@/lib/db'
import { addDaysISO, todayISO } from '@/lib/format'
import { uid } from '@/lib/id'
import { findLastPerformance, newExercise } from '@/lib/workouts'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ExerciseEditor } from '@/components/ExerciseEditor'
import { Chip, ExercisePicker } from '@/components/ExercisePicker'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface Draft {
  title: string
  date: string
  status: WorkoutStatus
  exercises: WorkoutExercise[]
  notes: string
}

const TITLE_SUGGESTIONS = ['Всё тело', 'Верх тела', 'Низ тела', 'Круговая', 'Кардио', 'Мобильность']

export function WorkoutEditorPage() {
  const { clientId: clientIdParam, workoutId } = useParams()

  const existing = useLiveQuery(
    async () => (workoutId ? ((await db.workouts.get(workoutId)) ?? null) : null),
    [workoutId],
  )
  const clientId = workoutId ? existing?.clientId : clientIdParam
  const client = useLiveQuery(
    async () => (clientId ? ((await db.clients.get(clientId)) ?? null) : undefined),
    [clientId],
  )

  if ((workoutId && existing === null) || client === null) {
    return (
      <>
        <PageHeader title="Тренировка" backTo="/" />
        <EmptyState icon={FileQuestion} title="Не найдено" description="Тренировка или клиент были удалены." />
      </>
    )
  }

  if (!client || (workoutId && !existing)) {
    return (
      <>
        <PageHeader
          title={workoutId ? 'Редактирование' : 'Новая тренировка'}
          backTo={workoutId ? `/workouts/${workoutId}` : '/'}
        />
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-11 rounded-xl" />
          <Skeleton className="h-11 rounded-xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </>
    )
  }

  return <WorkoutEditor key={existing?.id ?? 'new'} client={client} existing={existing ?? null} />
}

function WorkoutEditor({ client, existing }: { client: Client; existing: Workout | null }) {
  const navigate = useNavigate()
  const isEdit = existing !== null
  const clientId = client.id
  const workoutId = existing?.id

  const [draft, setDraft] = useState<Draft>(() =>
    existing
      ? {
          title: existing.title,
          date: existing.date,
          status: existing.status,
          exercises: existing.exercises,
          notes: existing.notes ?? '',
        }
      : { title: '', date: todayISO(), status: 'planned', exercises: [], notes: '' },
  )
  const [dirty, setDirty] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const proceedingRef = useRef(false)
  const listEndRef = useRef<HTMLDivElement>(null)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !savingRef.current && currentLocation.pathname !== nextLocation.pathname,
  )
  useBeforeUnload((e) => {
    if (dirty && !savingRef.current) e.preventDefault()
  })

  const update = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setDirty(true)
  }

  const setExercises = (fn: (list: WorkoutExercise[]) => WorkoutExercise[]) => {
    setDraft((d) => ({ ...d, exercises: fn(d.exercises) }))
    setDirty(true)
  }

  async function addExercise(name: string, metrics: Metric[]) {
    let ex = newExercise(name, metrics)
    const last = await findLastPerformance(clientId, name, workoutId)
    if (last) {
      ex = newExercise(
        name,
        last.exercise.metrics,
        last.exercise.sets.map((s) => ({ ...s, id: uid(), done: false })),
      )
      ex.restSec = last.exercise.restSec ?? null
    }
    setExercises((list) => [...list, ex])
    setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 150)
  }

  async function save() {
    if (saving) return
    setSaving(true)
    savingRef.current = true
    const now = Date.now()
    const exercises = draft.exercises
      .map((ex) => ({ ...ex, name: ex.name.trim(), note: ex.note?.trim() ?? '' }))
      .filter((ex) => ex.name || ex.sets.length)
      .map((ex) => ({ ...ex, name: ex.name || 'Упражнение' }))
    const data = {
      title: draft.title.trim() || 'Тренировка',
      date: draft.date || todayISO(),
      status: draft.status,
      notes: draft.notes.trim(),
      exercises,
    }
    try {
      let id = workoutId
      if (existing) {
        await db.workouts.update(existing.id, { ...data, updatedAt: now })
      } else {
        id = uid()
        await db.workouts.add({ id, clientId, ...data, createdAt: now, updatedAt: now })
      }
      for (const ex of exercises) await ensureExerciseInLibrary(ex.name, ex.metrics)
      toast.success(isEdit ? 'Изменения сохранены' : 'Тренировка сохранена')
      navigate(`/workouts/${id}`, { replace: true })
    } catch (err) {
      console.error(err)
      savingRef.current = false
      setSaving(false)
      toast.error('Не удалось сохранить тренировку')
    }
  }

  const backTo = existing ? `/workouts/${existing.id}` : `/clients/${clientId}?tab=plan`

  return (
    <>
      <PageHeader title={isEdit ? 'Редактирование' : 'Новая тренировка'} subtitle={client.name} backTo={backTo} />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
          {client.health && (
            <div className="flex gap-2.5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p className="whitespace-pre-wrap">{client.health}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Название</Label>
            <Input
              id="title"
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="Например, Низ тела + кор"
              className="h-11"
            />
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pt-1 [scrollbar-width:none]">
              {TITLE_SUGGESTIONS.map((t) => (
                <Chip
                  key={t}
                  active={draft.title === t}
                  onClick={() => update({ title: t })}
                  className="h-7 px-2.5 text-xs"
                >
                  {t}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">Дата</Label>
            <div className="flex gap-2">
              <Input
                id="date"
                type="date"
                value={draft.date}
                onChange={(e) => update({ date: e.target.value })}
                className="h-11 flex-1"
              />
              <Chip
                active={draft.date === todayISO()}
                onClick={() => update({ date: todayISO() })}
                className="h-11 rounded-lg"
              >
                Сегодня
              </Chip>
              <Chip
                active={draft.date === addDaysISO(todayISO(), 1)}
                onClick={() => update({ date: addDaysISO(todayISO(), 1) })}
                className="h-11 rounded-lg"
              >
                Завтра
              </Chip>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Статус">
            {(
              [
                ['planned', 'В плане', Clock],
                ['completed', 'Проведена', CheckCircle2],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={draft.status === value}
                onClick={() => update({ status: value })}
                className={cn(
                  'flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors',
                  draft.status === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                <Icon className={cn('size-4', draft.status === value && value === 'completed' && 'text-emerald-600')} />
                {label}
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-base font-semibold">Упражнения</h2>
            {draft.exercises.length > 0 && (
              <span className="text-sm text-muted-foreground">{draft.exercises.length}</span>
            )}
          </div>

          {draft.exercises.length === 0 && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border px-4 py-8 text-center active:bg-muted/60"
            >
              <Dumbbell className="size-7 text-primary" />
              <span className="font-medium">Добавьте первое упражнение</span>
              <span className="text-sm text-muted-foreground">
                Подходы, повторения и вес подставятся из прошлой тренировки клиента
              </span>
            </button>
          )}

          {draft.exercises.map((ex, i) => (
            <ExerciseEditor
              key={ex.id}
              exercise={ex}
              index={i}
              total={draft.exercises.length}
              clientId={clientId}
              workoutId={workoutId}
              onChange={(next) => setExercises((list) => list.map((e) => (e.id === ex.id ? next : e)))}
              onRemove={() => setExercises((list) => list.filter((e) => e.id !== ex.id))}
              onMove={(dir) =>
                setExercises((list) => {
                  const next = [...list]
                  const j = i + dir
                  if (j < 0 || j >= next.length) return list
                  ;[next[i], next[j]] = [next[j]!, next[i]!]
                  return next
                })
              }
            />
          ))}

          {draft.exercises.length > 0 && (
            <Button type="button" variant="outline" className="h-11 border-dashed" onClick={() => setPickerOpen(true)}>
              <Plus /> Добавить упражнение
            </Button>
          )}
          <div ref={listEndRef} />

          <div className="mt-2 flex flex-col gap-1.5">
            <Label htmlFor="notes">Заметки к тренировке</Label>
            <Textarea
              id="notes"
              value={draft.notes}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder="Самочувствие клиента, что получилось, что скорректировать в следующий раз"
              rows={4}
            />
          </div>
        </div>

        <div className="pb-safe sticky bottom-0 mt-auto border-t border-border/60 bg-background/90 px-4 pt-3 backdrop-blur-md">
          <Button className="mb-3 h-12 w-full text-base" onClick={save} disabled={saving}>
            {saving ? 'Сохраняем…' : isEdit ? 'Сохранить изменения' : 'Сохранить тренировку'}
          </Button>
        </div>
      </div>

      <ExercisePicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={addExercise} />

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && !proceedingRef.current && blocker.state === 'blocked') blocker.reset()
        }}
        title="Выйти без сохранения?"
        description="Изменения в тренировке будут потеряны."
        confirmLabel="Выйти"
        onConfirm={() => {
          proceedingRef.current = true
          blocker.proceed?.()
        }}
      />
    </>
  )
}
