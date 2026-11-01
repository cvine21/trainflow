import { useMemo, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Combine, Dumbbell, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { db, deleteExercise, EXERCISE_CATEGORIES, type Exercise, type Metric } from '@/lib/db'
import { createExercise, findExact, findSimilar, mergeExercises, updateExercise } from '@/lib/exercises'
import { countLabel, normalizeName } from '@/lib/format'
import { describeMetrics } from '@/lib/workouts'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Chip } from '@/components/Chip'
import { MetricsPicker } from '@/components/MetricsPicker'
import { ExercisePicker } from '@/components/ExercisePicker'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function ExercisesPage() {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null)
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])

  const groups = useMemo(() => {
    const q = normalizeName(query)
    const list = (exercises ?? []).filter((e) => !q || normalizeName(e.name).includes(q))
    const order = [...EXERCISE_CATEGORIES] as string[]
    const map = new Map<string, Exercise[]>()
    for (const e of list) map.set(e.category, [...(map.get(e.category) ?? []), e])
    return [...map.entries()].sort(([a], [b]) => {
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
  }, [exercises, query])

  return (
    <>
      <PageHeader
        large
        title="Упражнения"
        subtitle={exercises ? `${exercises.length} в базе` : undefined}
        actions={
          <Button
            size="icon-lg"
            className="rounded-full"
            onClick={() => setEditing('new')}
            aria-label="Новое упражнение"
          >
            <Plus className="size-5" />
          </Button>
        }
      />
      <div className="px-4 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск упражнения"
            className="h-11 rounded-xl bg-card pl-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-5 px-4 py-4">
        {!exercises && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        {exercises && groups.length === 0 && (
          <EmptyState
            icon={Dumbbell}
            title={query ? 'Ничего не найдено' : 'База упражнений пуста'}
            description={query ? `Упражнения «${query}» нет в базе.` : undefined}
            action={
              <Button size="lg" onClick={() => setEditing('new')}>
                <Plus /> Добавить упражнение
              </Button>
            }
          />
        )}
        {groups.map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">{category}</h2>
            <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
              {items.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(e)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{e.name}</span>
                      <span className="block text-xs text-muted-foreground">{describeMetrics(e.metrics)}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <ExerciseDialog
        key={editing === 'new' ? 'new' : (editing?.id ?? 'closed')}
        exercise={editing}
        library={exercises ?? []}
        onClose={() => setEditing(null)}
      />
    </>
  )
}

function ExerciseDialog({
  exercise,
  library,
  onClose,
}: {
  exercise: Exercise | 'new' | null
  library: Exercise[]
  onClose: () => void
}) {
  const existing = exercise && exercise !== 'new' ? exercise : null
  const [name, setName] = useState(existing?.name ?? '')
  const [category, setCategory] = useState(existing?.category ?? 'Функциональные')
  const [metrics, setMetrics] = useState<Metric[]>(existing?.metrics ?? ['reps', 'weight'])
  const [error, setError] = useState('')
  const [similarAcknowledged, setSimilarAcknowledged] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [mergePicker, setMergePicker] = useState(false)
  const [mergeTarget, setMergeTarget] = useState<Exercise | null>(null)

  const others = useMemo(() => library.filter((e) => e.id !== existing?.id), [library, existing?.id])
  const similar = existing ? [] : findSimilar(name, others)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError('Введите название')
    if (findExact(trimmed, others)) return setError('Такое упражнение уже есть в базе')
    if (similar.length && !similarAcknowledged) {
      setSimilarAcknowledged(true)
      return setError(`Похоже на «${similar[0]!.name}». Нажмите ещё раз, если это другое упражнение.`)
    }
    try {
      if (existing) {
        await updateExercise(existing.id, { name: trimmed, category, metrics })
        toast.success(
          existing.name !== trimmed ? 'Упражнение переименовано — история сохранена' : 'Упражнение обновлено',
        )
      } else {
        await createExercise(trimmed, category, metrics)
        toast.success('Упражнение добавлено')
      }
      onClose()
    } catch (err) {
      console.error(err)
      setError('Не удалось сохранить')
    }
  }

  return (
    <>
      <Dialog open={exercise !== null && !mergePicker} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="top-[8%] max-h-[84dvh] translate-y-0 overflow-y-auto sm:top-1/2 sm:-translate-y-1/2">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle className="text-lg">{existing ? 'Упражнение' : 'Новое упражнение'}</DialogTitle>
              <DialogDescription>Нагрузка и метрики определяют, какие поля появятся в подходах.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ex-name">Название</Label>
              <Input
                id="ex-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError('')
                  setSimilarAcknowledged(false)
                }}
                placeholder="Например, Тяга гири к подбородку"
                className="h-11"
                aria-invalid={!!error}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              {existing && existing.name !== name.trim() && name.trim() && (
                <p className="text-xs text-muted-foreground">Название обновится во всех тренировках.</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Категория</Label>
              <div className="flex flex-wrap gap-1.5">
                {EXERCISE_CATEGORIES.map((c) => (
                  <Chip key={c} active={category === c} onClick={() => setCategory(c)} className="h-8 text-xs">
                    {c}
                  </Chip>
                ))}
              </div>
            </div>
            <MetricsPicker metrics={metrics} onChange={setMetrics} />
            {existing && (
              <Button
                type="button"
                variant="outline"
                className="h-11 justify-start gap-2"
                onClick={() => setMergePicker(true)}
              >
                <Combine className="size-4" /> Это дубль — объединить с…
              </Button>
            )}
            <DialogFooter className="gap-2">
              {existing && (
                <Button
                  type="button"
                  variant="destructive"
                  className="h-11 sm:mr-auto"
                  onClick={() => setConfirmDelete(true)}
                >
                  Удалить
                </Button>
              )}
              <Button type="submit" className="h-11">
                {existing ? 'Сохранить' : 'Добавить'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {existing && (
        <>
          <ExercisePicker
            open={mergePicker}
            onOpenChange={setMergePicker}
            title={`Объединить «${existing.name}» с…`}
            excludeId={existing.id}
            allowCreate={false}
            onPick={(target) => setMergeTarget(target)}
          />
          <ConfirmDialog
            open={mergeTarget !== null}
            onOpenChange={(open) => !open && setMergeTarget(null)}
            title={`Объединить с «${mergeTarget?.name ?? ''}»?`}
            description={`Все тренировки с «${existing.name}» перейдут на «${mergeTarget?.name ?? ''}», а дубль удалится из базы. История и прогресс сольются.`}
            confirmLabel="Объединить"
            destructive={false}
            onConfirm={async () => {
              if (!mergeTarget) return
              const n = await mergeExercises(existing.id, mergeTarget.id)
              toast.success(
                n ? `Объединено, обновлено ${countLabel(n, ['тренировка', 'тренировки', 'тренировок'])}` : 'Объединено',
              )
              setMergeTarget(null)
              onClose()
            }}
          />
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title={`Удалить «${existing.name}»?`}
            description="Упражнение исчезнет из базы. В уже сохранённых тренировках оно останется."
            onConfirm={async () => {
              await deleteExercise(existing.id)
              toast.success('Упражнение удалено')
              onClose()
            }}
          />
        </>
      )}
    </>
  )
}
