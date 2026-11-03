import { Chip } from '@/components/Chip'
import { ClientPicker } from '@/components/ClientPicker'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { ExercisePicker } from '@/components/ExercisePicker'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { BlockCard } from '@/components/workout/BlockCard'
import { BlockFormatSheet, type BlockParams } from '@/components/workout/BlockFormatSheet'
import { useWorkoutDraft } from '@/hooks/useWorkoutDraft'
import {
  db,
  deleteWorkout,
  type Client,
  type Exercise,
  type Workout,
  type WorkoutBlock,
  type WorkoutExercise,
} from '@/lib/db'
import { addDaysISO, formatDateLong, todayISO } from '@/lib/format'
import { uid } from '@/lib/id'
import {
  changeBlockFormat,
  createWorkout,
  duplicateWorkout,
  findLastPerformance,
  isCircuit,
  newBlock,
  newExercise,
  type LastPerformance,
} from '@/lib/workouts'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Dumbbell,
  FileQuestion,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useBlocker, useLocation, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

const TITLE_SUGGESTIONS = ['Всё тело', 'Верх тела', 'Низ тела', 'Круговая', 'Кардио', 'Мобильность']

type PickerTarget =
  { kind: 'new' } | { kind: 'add'; blockId: string } | { kind: 'replace'; blockId: string; exerciseId: string }

type FormatTarget = { kind: 'new' } | { kind: 'edit'; blockId: string }

const PICKER_TITLE: Record<PickerTarget['kind'], string> = {
  new: 'Добавить упражнение',
  add: 'Упражнение в блок',
  replace: 'Заменить упражнение',
}

function isEmptyDraft(w: Workout): boolean {
  return w.status === 'planned' && !w.blocks.length && !w.title.trim() && !w.notes?.trim() && !w.time
}

function buildExercise(ex: Exercise, last: LastPerformance | null, circuit: boolean, setCount = 3): WorkoutExercise {
  let sets = last?.exercise.sets.map((s) => ({ ...s, id: uid() }))
  if (sets && circuit) sets = sets.slice(0, 1)
  else if (sets?.length === 1 && last && isCircuit(last.format)) {
    const [first] = sets
    sets = Array.from({ length: setCount }, () => ({ ...first!, id: uid() }))
  }
  const item = newExercise(
    { id: ex.id, name: ex.name, metrics: last?.exercise.metrics ?? ex.metrics },
    sets,
    circuit ? 1 : setCount,
  )
  item.restSec = circuit ? null : (last?.exercise.restSec ?? null)
  return item
}

function applyPick(blocks: WorkoutBlock[], target: PickerTarget, ex: Exercise, last: LastPerformance | null) {
  if (target.kind === 'new') return [...blocks, newBlock('sets', [buildExercise(ex, last, false)])]
  return blocks.map((b) => {
    if (b.id !== target.blockId) return b
    const circuit = isCircuit(b.format)
    if (target.kind === 'add') return { ...b, exercises: [...b.exercises, buildExercise(ex, last, circuit)] }
    return {
      ...b,
      exercises: b.exercises.map((e) =>
        e.id === target.exerciseId ? buildExercise(ex, last, circuit, e.sets.length || 3) : e,
      ),
    }
  })
}

const canJoinSuperset = (b?: WorkoutBlock) => !!b && (b.format === 'sets' || b.format === 'superset')

/** Creates an empty planned workout for the client and opens it. */
export function NewWorkoutPage() {
  const { clientId = '' } = useParams()
  const navigate = useNavigate()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      if (!(await db.clients.get(clientId))) {
        navigate('/', { replace: true })
        return
      }
      const id = await createWorkout(clientId)
      navigate(`/workouts/${id}`, { replace: true, state: { fresh: true } })
    })()
  }, [clientId, navigate])

  return (
    <>
      <PageHeader title="Новая тренировка" backTo={`/clients/${clientId}`} />
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    </>
  )
}

/** The separate editor was merged into the workout screen; keeps old links working. */
export function WorkoutEditRedirect() {
  const { workoutId = '' } = useParams()
  return <Navigate to={`/workouts/${workoutId}`} replace />
}

// Counts mounted screens per fresh draft so StrictMode's remount doesn't delete it.
const openDrafts = new Map<string, number>()

export function WorkoutPage() {
  const { workoutId = '' } = useParams()
  const navigate = useNavigate()
  const fresh = (useLocation().state as { fresh?: boolean } | null)?.fresh === true
  const { workout, change, save, discard, saveState, dirty } = useWorkoutDraft(workoutId)
  const client = useLiveQuery(
    async () => (workout ? ((await db.clients.get(workout.clientId)) ?? null) : undefined),
    [workout?.clientId],
  )
  const [unlocked, setUnlocked] = useState(false)
  const [picker, setPicker] = useState<PickerTarget | null>(null)
  // Keeps the sheet title stable while it animates out.
  const [pickerKind, setPickerKind] = useState<PickerTarget['kind']>('new')
  if (picker && picker.kind !== pickerKind) setPickerKind(picker.kind)
  const [formatTarget, setFormatTarget] = useState<FormatTarget | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmComplete, setConfirmComplete] = useState(false)
  const [repeatOpen, setRepeatOpen] = useState(false)
  const leaveProceeding = useRef(false)
  const blocker = useBlocker(dirty)

  useEffect(() => {
    if (!fresh) return
    openDrafts.set(workoutId, (openDrafts.get(workoutId) ?? 0) + 1)
    return () => {
      openDrafts.set(workoutId, (openDrafts.get(workoutId) ?? 1) - 1)
      setTimeout(async () => {
        if (openDrafts.get(workoutId)) return
        openDrafts.delete(workoutId)
        const w = await db.workouts.get(workoutId)
        if (w && isEmptyDraft(w)) await deleteWorkout(w.id)
      }, 0)
    }
  }, [fresh, workoutId])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

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

  const isPlanned = workout.status === 'planned'
  const editable = isPlanned || unlocked
  const backTo = `/clients/${workout.clientId}?tab=${isPlanned ? 'plan' : 'history'}`
  const blocks = workout.blocks

  const setBlocks = (fn: (blocks: WorkoutBlock[]) => WorkoutBlock[]) => change((w) => ({ ...w, blocks: fn(w.blocks) }))
  const updateBlock = (block: WorkoutBlock) => setBlocks((bs) => bs.map((b) => (b.id === block.id ? block : b)))
  const removeBlock = (blockId: string) => {
    const before = blocks
    setBlocks((bs) => bs.filter((b) => b.id !== blockId))
    toast('Удалено из тренировки', { action: { label: 'Вернуть', onClick: () => setBlocks(() => before) } })
  }
  const moveBlock = (i: number, dir: -1 | 1) =>
    setBlocks((bs) => {
      const j = i + dir
      if (j < 0 || j >= bs.length) return bs
      const next = [...bs]
      ;[next[i], next[j]] = [next[j]!, next[i]!]
      return next
    })
  const mergeNext = (i: number) =>
    setBlocks((bs) => {
      const a = bs[i]
      const b = bs[i + 1]
      if (!canJoinSuperset(a) || !canJoinSuperset(b)) return bs
      const merged: WorkoutBlock = { ...a!, format: 'superset', exercises: [...a!.exercises, ...b!.exercises] }
      return [...bs.slice(0, i), merged, ...bs.slice(i + 2)]
    })
  const splitExercise = (blockId: string, exerciseId: string) =>
    setBlocks((bs) =>
      bs.flatMap((b) => {
        const ex = b.id === blockId ? b.exercises.find((e) => e.id === exerciseId) : undefined
        if (!ex) return [b]
        const rest = b.exercises.filter((e) => e.id !== exerciseId)
        const remaining: WorkoutBlock = {
          ...b,
          format: b.format === 'superset' && rest.length === 1 ? 'sets' : b.format,
          exercises: rest,
        }
        return [remaining, newBlock('sets', [ex])]
      }),
    )

  async function handlePick(ex: Exercise) {
    const target = picker
    if (!target || !workout) return
    const last = await findLastPerformance(workout.clientId, { exerciseId: ex.id, name: ex.name }, workout.id)
    setBlocks((bs) => applyPick(bs, target, ex, last))
  }

  function handleFormat(params: BlockParams) {
    const target = formatTarget
    if (!target) return
    if (target.kind === 'new') {
      const block: WorkoutBlock = { ...newBlock(params.format), ...params }
      setBlocks((bs) => [...bs, block])
      setTimeout(() => setPicker({ kind: 'add', blockId: block.id }), 250)
      return
    }
    setBlocks((bs) =>
      changeBlockFormat(bs, target.blockId, params.format).map((b) =>
        b.id === target.blockId ? { ...b, ...params } : b,
      ),
    )
  }

  async function handleSave() {
    await save()
    toast.success('Сохранено')
  }

  async function markCompleted() {
    change((w) => ({ ...w, status: 'completed' }))
    await save()
    setUnlocked(false)
    toast.success('Тренировка в истории')
  }

  async function returnToPlan() {
    change((w) => ({ ...w, status: 'planned' }))
    await save()
    toast.success('Тренировка снова в плане')
  }

  async function leaveWithSave() {
    leaveProceeding.current = true
    await save()
    toast.success('Сохранено')
    blocker.proceed?.()
  }

  function leaveWithoutSave() {
    leaveProceeding.current = true
    discard()
    blocker.proceed?.()
  }

  async function repeatFor(target: Client) {
    if (!workout) return
    if (dirty) await save()
    const id = await duplicateWorkout(workout, { clientId: target.id })
    const same = target.id === workout.clientId
    toast.success(
      same ? 'Создана копия в плане — проверьте дату и веса' : `Копия для ${target.name} — проверьте дату и веса`,
    )
    navigate(`/workouts/${id}`)
  }

  const formatInitial = formatTarget?.kind === 'edit' ? blocks.find((b) => b.id === formatTarget.blockId) : undefined

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
              <DropdownMenuItem className="h-10" onClick={() => setRepeatOpen(true)}>
                <Copy /> Повторить тренировку
              </DropdownMenuItem>
              {isPlanned ? (
                <DropdownMenuItem className="h-10" onClick={() => setConfirmComplete(true)}>
                  <CheckCircle2 /> Перенести в историю
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="h-10" onClick={() => void returnToPlan()}>
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
        {client?.health && (
          <div className="flex gap-2.5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="whitespace-pre-wrap">{client.health}</p>
          </div>
        )}

        {editable ? (
          <section className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Название</Label>
              <Input
                id="title"
                value={workout.title}
                onChange={(e) => change((w) => ({ ...w, title: e.target.value }))}
                placeholder="Например, Низ тела + кор"
                className="h-11"
              />
              <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pt-1 [scrollbar-width:none]">
                {TITLE_SUGGESTIONS.map((t) => (
                  <Chip
                    key={t}
                    active={workout.title === t}
                    onClick={() => change((w) => ({ ...w, title: t }))}
                    className="h-7 px-2.5 text-xs"
                  >
                    {t}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="date">Дата</Label>
                <Input
                  id="date"
                  type="date"
                  value={workout.date}
                  onChange={(e) => e.target.value && change((w) => ({ ...w, date: e.target.value }))}
                  className="h-11"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="time">Время</Label>
                <div className="relative">
                  <Input
                    id="time"
                    type="time"
                    value={workout.time ?? ''}
                    onChange={(e) => change((w) => ({ ...w, time: e.target.value }))}
                    className="h-11"
                  />
                  {workout.time && (
                    <button
                      type="button"
                      onClick={() => change((w) => ({ ...w, time: '' }))}
                      className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-card text-muted-foreground active:bg-muted"
                      aria-label="Убрать время"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Chip
                active={workout.date === todayISO()}
                onClick={() => change((w) => ({ ...w, date: todayISO() }))}
                className="h-8 text-xs"
              >
                Сегодня
              </Chip>
              <Chip
                active={workout.date === addDaysISO(todayISO(), 1)}
                onClick={() => change((w) => ({ ...w, date: addDaysISO(todayISO(), 1) }))}
                className="h-8 text-xs"
              >
                Завтра
              </Chip>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-border/70 bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium first-letter:uppercase">
                {formatDateLong(workout.date)}
                {workout.time && `, ${workout.time}`}
              </p>
              <StatusBadge status={workout.status} date={workout.date} />
            </div>
            {client && (
              <Link to={`/clients/${client.id}`} className="mt-0.5 inline-block text-sm text-primary">
                {client.name}
              </Link>
            )}
          </section>
        )}

        {blocks.length === 0 &&
          (editable ? (
            <button
              type="button"
              onClick={() => setPicker({ kind: 'new' })}
              className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border px-4 py-8 text-center active:bg-muted/60"
            >
              <Dumbbell className="size-7 text-primary" />
              <span className="font-medium">Добавьте первое упражнение</span>
              <span className="text-sm text-muted-foreground">
                Подходы и веса подставятся из прошлой тренировки клиента
              </span>
            </button>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              В тренировке нет упражнений
            </div>
          ))}

        {blocks.map((block, i) => (
          <BlockCard
            key={block.id}
            block={block}
            index={i}
            total={blocks.length}
            canMergeNext={canJoinSuperset(block) && canJoinSuperset(blocks[i + 1])}
            editable={editable}
            onChange={updateBlock}
            onRemove={() => removeBlock(block.id)}
            onMove={(dir) => moveBlock(i, dir)}
            onMergeNext={() => mergeNext(i)}
            onEditFormat={() => setFormatTarget({ kind: 'edit', blockId: block.id })}
            onAddExercise={() => setPicker({ kind: 'add', blockId: block.id })}
            onReplaceExercise={(exerciseId) => setPicker({ kind: 'replace', blockId: block.id, exerciseId })}
            onSplitExercise={(exerciseId) => splitExercise(block.id, exerciseId)}
          />
        ))}

        {editable && blocks.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 border-dashed"
              onClick={() => setPicker({ kind: 'new' })}
            >
              <Plus /> Упражнение
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 border-dashed"
              onClick={() => setFormatTarget({ kind: 'new' })}
            >
              <Layers /> Блок
            </Button>
          </div>
        )}
        {editable && blocks.length === 0 && (
          <Button
            type="button"
            variant="outline"
            className="h-11 border-dashed"
            onClick={() => setFormatTarget({ kind: 'new' })}
          >
            <Layers /> Суперсет, круг, EMOM, AMRAP…
          </Button>
        )}

        <section className="mt-1 flex flex-col gap-1.5">
          <Label htmlFor="notes">Заметки тренера</Label>
          <Textarea
            id="notes"
            value={workout.notes ?? ''}
            onChange={(e) => change((w) => ({ ...w, notes: e.target.value }))}
            placeholder="Самочувствие, техника, что поменять в следующий раз"
            rows={3}
            className="bg-card"
          />
        </section>
      </div>

      <div className="pb-safe sticky bottom-0 z-20 mt-auto flex gap-2 border-t border-border/60 bg-background/90 px-4 pt-3 backdrop-blur-md">
        {editable ? (
          <>
            {!isPlanned && (
              <Button
                type="button"
                variant="outline"
                className="mb-3 h-12 flex-1 text-base"
                onClick={() => setUnlocked(false)}
              >
                <Check /> Готово
              </Button>
            )}
            <Button
              type="button"
              className="mb-3 h-12 flex-[1.4] text-base"
              disabled={!dirty || saveState === 'saving'}
              onClick={() => void handleSave()}
            >
              Сохранить
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              className="mb-3 h-12 flex-1 text-base"
              onClick={() => setUnlocked(true)}
            >
              <Pencil /> Изменить
            </Button>
            <Button type="button" className="mb-3 h-12 flex-[1.4] text-base" onClick={() => setRepeatOpen(true)}>
              <Copy /> Повторить
            </Button>
          </>
        )}
      </div>

      <ExercisePicker
        open={picker !== null}
        onOpenChange={(open) => !open && setPicker(null)}
        title={PICKER_TITLE[pickerKind]}
        onPick={handlePick}
      />

      <BlockFormatSheet
        open={formatTarget !== null}
        onOpenChange={(open) => !open && setFormatTarget(null)}
        mode={formatTarget?.kind === 'new' ? 'new' : 'edit'}
        initial={formatInitial}
        onSave={handleFormat}
      />

      <ClientPicker
        open={repeatOpen}
        onOpenChange={setRepeatOpen}
        title="Кому назначить копию?"
        currentClientId={workout.clientId}
        onPick={(c) => void repeatFor(c)}
      />

      <ConfirmDialog
        open={confirmComplete}
        onOpenChange={setConfirmComplete}
        title="Перенести в историю?"
        description="Тренировка пропадёт из плана и появится в истории клиента как уже проведённая. Позже её можно вернуть в план."
        confirmLabel="В историю"
        destructive={false}
        onConfirm={markCompleted}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Удалить тренировку?"
        description="Тренировка и заметки к ней будут удалены без возможности восстановления."
        onConfirm={async () => {
          discard()
          await deleteWorkout(workout.id)
          toast.success('Тренировка удалена')
          navigate(backTo, { replace: true })
        }}
      />

      <AlertDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (open) return
          if (leaveProceeding.current) {
            leaveProceeding.current = false
            return
          }
          blocker.reset?.()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Сохранить изменения?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-col-reverse sm:items-stretch">
            <AlertDialogCancel className="h-10">Отмена</AlertDialogCancel>
            <Button type="button" variant="outline" className="h-10" onClick={leaveWithoutSave}>
              Не сохранять
            </Button>
            <Button type="button" className="h-10" onClick={() => void leaveWithSave()}>
              Сохранить
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
