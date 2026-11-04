import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { MetricsPicker } from '@/components/MetricsPicker'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/Sheet'
import { db, EXERCISE_CATEGORIES, type Exercise, type Metric } from '@/lib/db'
import { createExercise, findExact, findSimilar } from '@/lib/exercises'
import { normalizeName } from '@/lib/format'
import { describeMetrics } from '@/lib/workouts'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Plus, Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import styles from './ExercisePicker.module.css'

interface ExercisePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (exercise: Exercise) => void
  title?: string
  /** Hide one entry (e.g. the exercise being merged). */
  excludeId?: string
  allowCreate?: boolean
}

export function ExercisePicker({
  open,
  onOpenChange,
  onPick,
  title = 'Добавить упражнение',
  excludeId,
  allowCreate = true,
}: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])
  const library = useMemo(() => (exercises ?? []).filter((e) => e.id !== excludeId), [exercises, excludeId])

  const q = normalizeName(query)
  const filtered = useMemo(
    () => library.filter((e) => (!category || e.category === category) && (!q || normalizeName(e.name).includes(q))),
    [library, q, category],
  )
  const exact = findExact(query, library)
  const similar = useMemo(
    () => (q && !exact ? findSimilar(query, library).filter((e) => !filtered.includes(e)) : []),
    [q, exact, query, library, filtered],
  )
  const usedCategories = useMemo(
    () => EXERCISE_CATEGORIES.filter((c) => library.some((e) => e.category === c)),
    [library],
  )

  function reset() {
    setQuery('')
    setCategory(null)
    setCreating(false)
  }

  function pick(e: Exercise) {
    onPick(e)
    onOpenChange(false)
    reset()
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <SheetContent side="bottom" className={styles.sheet}>
        {creating ? (
          <CreateExercise
            initialName={query.trim()}
            initialCategory={category}
            library={library}
            onBack={() => setCreating(false)}
            onPick={pick}
          />
        ) : (
          <>
            <SheetHeader className={styles.header}>
              <div className={styles.handle} aria-hidden />
              <SheetTitle className={styles.title}>{title}</SheetTitle>
              <SheetDescription className={styles.srOnly}>
                Выберите упражнение из базы или создайте новое
              </SheetDescription>
              <div className={styles.searchWrap}>
                <Search className={styles.searchIcon} />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={allowCreate ? 'Найти или создать' : 'Найти упражнение'}
                  className={styles.searchInput}
                  enterKeyHint="done"
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' || !q) return
                    e.preventDefault()
                    if (exact) pick(exact)
                    else if (allowCreate && !similar.length && !filtered.length) setCreating(true)
                  }}
                />
              </div>
              <div className={styles.categories}>
                <Chip active={!category} onClick={() => setCategory(null)}>
                  Все
                </Chip>
                {usedCategories.map((c) => (
                  <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            </SheetHeader>

            <div className={styles.list}>
              {similar.length > 0 && (
                <div className={styles.suggest}>
                  <p className={styles.suggestTitle}>
                    <Sparkles className={styles.sparkles} /> Похоже, вы имели в виду
                  </p>
                  {similar.map((e) => (
                    <ExerciseRow key={e.id} exercise={e} onClick={() => pick(e)} />
                  ))}
                </div>
              )}
              {filtered.map((e) => (
                <ExerciseRow key={e.id} exercise={e} onClick={() => pick(e)} />
              ))}
              {exercises && !filtered.length && !similar.length && (
                <p className={styles.empty}>
                  {q ? 'В базе такого упражнения нет' : 'В этой категории пока нет упражнений'}
                </p>
              )}
              {allowCreate && q && !exact && (
                <button type="button" onClick={() => setCreating(true)} className={styles.create}>
                  <span className={styles.createIcon}>
                    <Plus className={styles.plus} />
                  </span>
                  <span className={styles.createText}>
                    <span className={styles.createName}>Создать «{query.trim()}»</span>
                    <span className={styles.createHint}>Выберите категорию и что записывать</span>
                  </span>
                </button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function ExerciseRow({ exercise, onClick }: { exercise: Exercise; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={styles.row}>
      <span className={styles.rowBody}>
        <span className={styles.rowName}>{exercise.name}</span>
        <span className={styles.rowMeta}>
          {exercise.category} · {describeMetrics(exercise.metrics).toLowerCase()}
        </span>
      </span>
      <Plus className={styles.rowIcon} />
    </button>
  )
}

function CreateExercise({
  initialName,
  initialCategory,
  library,
  onBack,
  onPick,
}: {
  initialName: string
  initialCategory: string | null
  library: Exercise[]
  onBack: () => void
  onPick: (exercise: Exercise) => void
}) {
  const [name, setName] = useState(initialName)
  const [category, setCategory] = useState<string | null>(initialCategory)
  const [metrics, setMetrics] = useState<Metric[]>(['reps', 'weight'])
  const [busy, setBusy] = useState(false)
  const exact = findExact(name, library)
  const similar = exact ? [] : findSimilar(name, library)

  async function submit() {
    if (!name.trim() || !category || exact || busy) return
    setBusy(true)
    try {
      onPick(await createExercise(name, category, metrics))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <SheetHeader className={styles.createHeader}>
        <Button variant="ghost" size="icon-lg" className={styles.back} onClick={onBack} aria-label="Назад к списку">
          <ArrowLeft className={styles.backIcon} />
        </Button>
        <SheetTitle className={styles.title}>Новое упражнение</SheetTitle>
        <SheetDescription className={styles.srOnly}>Название, категория и метрики нового упражнения</SheetDescription>
      </SheetHeader>
      <div className={styles.form}>
        <div className={styles.field}>
          <Label htmlFor="new-ex-name">Название</Label>
          <Input
            id="new-ex-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.nameInput}
            aria-invalid={!!exact}
          />
          {exact && (
            <button type="button" onClick={() => onPick(exact)} className={styles.exact}>
              «{exact.name}» уже есть в базе — <span className={styles.exactPick}>выбрать его</span>
            </button>
          )}
          {similar.length > 0 && (
            <div className={styles.similar}>
              <span>Похожие уже есть в базе — возможно, опечатка:</span>
              <div className={styles.similarChips}>
                {similar.map((e) => (
                  <Chip key={e.id} onClick={() => onPick(e)} className={styles.chipSmall}>
                    {e.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className={styles.field}>
          <Label>Категория</Label>
          <div className={styles.chipWrap}>
            {EXERCISE_CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)} className={styles.chip}>
                {c}
              </Chip>
            ))}
          </div>
        </div>
        <MetricsPicker metrics={metrics} onChange={setMetrics} />
      </div>
      <div className={styles.footer}>
        <Button className={styles.submit} onClick={submit} disabled={!name.trim() || !category || !!exact || busy}>
          {category ? 'Создать и добавить' : 'Выберите категорию'}
        </Button>
      </div>
    </>
  )
}
