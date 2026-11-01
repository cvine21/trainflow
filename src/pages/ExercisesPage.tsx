import { useMemo, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Dumbbell, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { db, deleteExercise, EXERCISE_CATEGORIES, type Exercise, type Metric } from '@/lib/db'
import { uid } from '@/lib/id'
import { METRIC_LABELS, METRIC_ORDER, sortMetrics } from '@/lib/workouts'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Chip } from '@/components/ExercisePicker'
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
    const q = query.trim().toLowerCase()
    const list = (exercises ?? []).filter((e) => !q || e.name.toLowerCase().includes(q))
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
                      <span className="block text-xs text-muted-foreground">
                        {sortMetrics(e.metrics)
                          .map((m) => METRIC_LABELS[m].full)
                          .join(' · ')}
                      </span>
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
        onClose={() => setEditing(null)}
      />
    </>
  )
}

function ExerciseDialog({ exercise, onClose }: { exercise: Exercise | 'new' | null; onClose: () => void }) {
  const existing = exercise && exercise !== 'new' ? exercise : null
  const [name, setName] = useState(existing?.name ?? '')
  const [category, setCategory] = useState(existing?.category ?? 'Функциональные')
  const [metrics, setMetrics] = useState<Metric[]>(existing?.metrics ?? ['reps', 'weight'])
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError('Введите название')
    const duplicate = await db.exercises.where('name').equalsIgnoreCase(trimmed).first()
    if (duplicate && duplicate.id !== existing?.id) return setError('Такое упражнение уже есть в базе')
    try {
      const now = Date.now()
      if (existing) {
        await db.exercises.update(existing.id, {
          name: trimmed,
          category,
          metrics: sortMetrics(metrics),
          updatedAt: now,
        })
        toast.success('Упражнение обновлено')
      } else {
        await db.exercises.add({
          id: uid(),
          name: trimmed,
          category,
          metrics: sortMetrics(metrics),
          createdAt: now,
          updatedAt: now,
        })
        toast.success('Упражнение добавлено')
      }
      onClose()
    } catch (err) {
      console.error(err)
      setError('Не удалось сохранить')
    }
  }

  const toggle = (m: Metric) =>
    setMetrics((list) => (list.includes(m) ? (list.length > 1 ? list.filter((x) => x !== m) : list) : [...list, m]))

  return (
    <>
      <Dialog open={exercise !== null} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="top-[12%] translate-y-0 sm:top-1/2 sm:-translate-y-1/2">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle className="text-lg">{existing ? 'Упражнение' : 'Новое упражнение'}</DialogTitle>
              <DialogDescription>
                Метрики определяют, какие поля появятся в подходах при составлении тренировки.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ex-name">Название</Label>
              <Input
                id="ex-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError('')
                }}
                placeholder="Например, Тяга гири к подбородку"
                className="h-11"
                aria-invalid={!!error}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
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
            <div className="flex flex-col gap-1.5">
              <Label>Что записываем</Label>
              <div className="flex flex-wrap gap-1.5">
                {METRIC_ORDER.map((m) => (
                  <Chip key={m} active={metrics.includes(m)} onClick={() => toggle(m)} className="h-8 text-xs">
                    {METRIC_LABELS[m].full}
                  </Chip>
                ))}
              </div>
            </div>
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
      )}
    </>
  )
}
