import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/Dialog'
import { EmptyState } from '@/components/EmptyState'
import { ExercisePicker } from '@/components/ExercisePicker'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { MetricsPicker } from '@/components/MetricsPicker'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { db, deleteExercise, EXERCISE_CATEGORIES, type Exercise, type Metric } from '@/lib/db'
import { createExercise, findExact, findSimilar, mergeExercises, updateExercise } from '@/lib/exercises'
import { countLabel, normalizeName } from '@/lib/format'
import { describeMetrics } from '@/lib/workouts'
import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Combine, Dumbbell, Plus, Search } from 'lucide-react'
import { useMemo, useState, type SubmitEvent } from 'react'
import { toast } from 'sonner'
import styles from './ExercisesPage.module.css'

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
            className={styles.roundIcon}
            onClick={() => setEditing('new')}
            aria-label="Новое упражнение"
          >
            <Plus className={styles.iconMd} />
          </Button>
        }
      />
      <div className={styles.searchWrap}>
        <div className={styles.search}>
          <Search className={styles.searchIcon} />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск упражнения"
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.page}>
        {!exercises && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className={styles.skeleton} />)}
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
            <h2 className={styles.category}>{category}</h2>
            <ul className={styles.list}>
              {items.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => setEditing(e)} className={styles.row}>
                    <span className={styles.rowBody}>
                      <span className={styles.rowName}>{e.name}</span>
                      <span className={styles.rowMeta}>{describeMetrics(e.metrics)}</span>
                    </span>
                    <ChevronRight className={styles.chevron} />
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

  async function submit(e: SubmitEvent) {
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
        <DialogContent className={clsx(styles.dialog)}>
          <form onSubmit={submit} className={styles.form}>
            <DialogHeader>
              <DialogTitle className={styles.dialogTitle}>{existing ? 'Упражнение' : 'Новое упражнение'}</DialogTitle>
              <DialogDescription>Нагрузка и метрики определяют, какие поля появятся в подходах.</DialogDescription>
            </DialogHeader>
            <div className={styles.field}>
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
                className={styles.control}
                aria-invalid={!!error}
              />
              {error && <p className={styles.error}>{error}</p>}
              {existing && existing.name !== name.trim() && name.trim() && (
                <p className={styles.hint}>Название обновится во всех тренировках.</p>
              )}
            </div>
            <div className={styles.field}>
              <Label>Категория</Label>
              <div className={styles.chips}>
                {EXERCISE_CATEGORIES.map((c) => (
                  <Chip key={c} active={category === c} onClick={() => setCategory(c)} className={styles.chip}>
                    {c}
                  </Chip>
                ))}
              </div>
            </div>
            <MetricsPicker metrics={metrics} onChange={setMetrics} />
            {existing && (
              <Button type="button" variant="outline" className={styles.merge} onClick={() => setMergePicker(true)}>
                <Combine className={styles.icon} /> Это дубль — объединить с…
              </Button>
            )}
            <DialogFooter className={styles.footer}>
              {existing && (
                <Button
                  type="button"
                  variant="destructive"
                  className={styles.deleteButton}
                  onClick={() => setConfirmDelete(true)}
                >
                  Удалить
                </Button>
              )}
              <Button type="submit" className={styles.submit}>
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
