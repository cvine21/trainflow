import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Plus, Search, Sparkles } from 'lucide-react'
import { db, EXERCISE_CATEGORIES, type Exercise, type Metric } from '@/lib/db'
import { createExercise, findExact, findSimilar } from '@/lib/exercises'
import { normalizeName } from '@/lib/format'
import { describeMetrics } from '@/lib/workouts'
import { Chip } from '@/components/Chip'
import { MetricsPicker } from '@/components/MetricsPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

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
      <SheetContent side="bottom" className="mx-auto max-w-lg gap-0 rounded-t-3xl p-0 data-[side=bottom]:h-[88dvh]">
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
            <SheetHeader className="border-b border-border/60 px-4 pt-4 pb-3">
              <div className="mx-auto -mt-1 mb-2 h-1 w-10 rounded-full bg-muted-foreground/25" aria-hidden />
              <SheetTitle className="font-sans text-lg font-semibold">{title}</SheetTitle>
              <SheetDescription className="sr-only">Выберите упражнение из базы или создайте новое</SheetDescription>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={allowCreate ? 'Найти или создать' : 'Найти упражнение'}
                  className="h-11 rounded-xl pl-9"
                  enterKeyHint="done"
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' || !q) return
                    e.preventDefault()
                    if (exact) pick(exact)
                    else if (allowCreate && !similar.length && !filtered.length) setCreating(true)
                  }}
                />
              </div>
              <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
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

            <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2">
              {similar.length > 0 && (
                <div className="mb-1 rounded-2xl bg-accent/60 p-1">
                  <p className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-xs font-medium text-accent-foreground">
                    <Sparkles className="size-3.5" /> Похоже, вы имели в виду
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
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {q ? 'В базе такого упражнения нет' : 'В этой категории пока нет упражнений'}
                </p>
              )}
              {allowCreate && q && !exact && (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="mt-1 flex w-full items-center gap-3 rounded-xl border border-dashed border-border px-3 py-3 text-left active:bg-muted"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Plus className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">Создать «{query.trim()}»</span>
                    <span className="block text-xs text-muted-foreground">Выберите категорию и что записывать</span>
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
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left active:bg-muted"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{exercise.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {exercise.category} · {describeMetrics(exercise.metrics).toLowerCase()}
        </span>
      </span>
      <Plus className="size-4 shrink-0 text-muted-foreground" />
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
      <SheetHeader className="flex-row items-center gap-1 border-b border-border/60 px-2 pt-3 pb-2">
        <Button variant="ghost" size="icon-lg" className="rounded-full" onClick={onBack} aria-label="Назад к списку">
          <ArrowLeft className="size-5" />
        </Button>
        <SheetTitle className="font-sans text-lg font-semibold">Новое упражнение</SheetTitle>
        <SheetDescription className="sr-only">Название, категория и метрики нового упражнения</SheetDescription>
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-ex-name">Название</Label>
          <Input
            id="new-ex-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11"
            aria-invalid={!!exact}
          />
          {exact && (
            <button type="button" onClick={() => onPick(exact)} className="text-left text-xs text-destructive">
              «{exact.name}» уже есть в базе — <span className="font-medium underline">выбрать его</span>
            </button>
          )}
          {similar.length > 0 && (
            <div className="flex flex-col gap-1 rounded-xl bg-accent/60 p-2.5 text-xs text-accent-foreground">
              <span>Похожие уже есть в базе — возможно, опечатка:</span>
              <div className="flex flex-wrap gap-1.5">
                {similar.map((e) => (
                  <Chip key={e.id} onClick={() => onPick(e)} className="h-7 px-2.5 text-xs">
                    {e.name}
                  </Chip>
                ))}
              </div>
            </div>
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
      </div>
      <div className="pb-safe border-t border-border/60 px-4 pt-3">
        <Button
          className="mb-3 h-12 w-full text-base"
          onClick={submit}
          disabled={!name.trim() || !category || !!exact || busy}
        >
          {category ? 'Создать и добавить' : 'Выберите категорию'}
        </Button>
      </div>
    </>
  )
}
