import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search } from 'lucide-react'
import { db, EXERCISE_CATEGORIES, type Metric } from '@/lib/db'
import { METRIC_LABELS, sortMetrics } from '@/lib/workouts'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface ExercisePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (name: string, metrics: Metric[]) => void
}

export function ExercisePicker({ open, onOpenChange, onPick }: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (exercises ?? []).filter(
      (e) => (!category || e.category === category) && (!q || e.name.toLowerCase().includes(q)),
    )
  }, [exercises, query, category])

  const usedCategories = useMemo(
    () => EXERCISE_CATEGORIES.filter((c) => exercises?.some((e) => e.category === c)),
    [exercises],
  )

  const trimmed = query.trim()
  const exactExists = exercises?.some((e) => e.name.toLowerCase() === trimmed.toLowerCase())

  function pick(name: string, metrics: Metric[]) {
    onPick(name, metrics)
    onOpenChange(false)
    setQuery('')
    setCategory(null)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-lg gap-0 rounded-t-3xl p-0 data-[side=bottom]:h-[88dvh]">
        <SheetHeader className="border-b border-border/60 px-4 pt-4 pb-3">
          <div className="mx-auto -mt-1 mb-2 h-1 w-10 rounded-full bg-muted-foreground/25" aria-hidden />
          <SheetTitle className="text-lg">Добавить упражнение</SheetTitle>
          <SheetDescription className="sr-only">Выберите упражнение из базы или создайте новое</SheetDescription>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Найти или ввести новое"
              className="h-11 rounded-xl pl-9"
              enterKeyHint="done"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && trimmed) {
                  e.preventDefault()
                  const match = filtered[0]
                  if (match && match.name.toLowerCase() === trimmed.toLowerCase()) pick(match.name, match.metrics)
                  else pick(trimmed, ['reps', 'weight'])
                }
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
          {trimmed && !exactExists && (
            <button
              type="button"
              onClick={() => pick(trimmed, ['reps', 'weight'])}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left active:bg-muted"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Plus className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">Добавить «{trimmed}»</span>
                <span className="block text-xs text-muted-foreground">Новое упражнение сохранится в базе</span>
              </span>
            </button>
          )}
          {filtered.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => pick(e.name, e.metrics)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left active:bg-muted"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{e.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {e.category} ·{' '}
                  {sortMetrics(e.metrics)
                    .map((m) => METRIC_LABELS[m].short.toLowerCase())
                    .join(', ')}
                </span>
              </span>
              <Plus className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
          {exercises && filtered.length === 0 && !trimmed && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">В этой категории пока нет упражнений</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-8 shrink-0 rounded-full border px-3 text-sm whitespace-nowrap transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground/80 active:bg-muted',
        className,
      )}
    >
      {children}
    </button>
  )
}
