import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { countLabel, formatClock, formatDate, formatNumber } from '@/lib/format'
import type { ExerciseProgress } from '@/lib/workouts'
import { LineChart } from '@/components/LineChart'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export function ExerciseProgressSheet({
  progress,
  onClose,
}: {
  progress: ExerciseProgress | null
  onClose: () => void
}) {
  // Keep the last item rendered while the sheet animates out.
  const [shown, setShown] = useState(progress)
  if (progress && progress !== shown) setShown(progress)

  return (
    <Sheet open={progress !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-w-lg gap-0 rounded-t-3xl p-0 data-[side=bottom]:max-h-[88dvh]">
        {shown && <ProgressBody progress={shown} />}
      </SheetContent>
    </Sheet>
  )
}

function ProgressBody({ progress }: { progress: ExerciseProgress }) {
  const sessions = [...progress.sessions].reverse()
  const isTime = progress.chart.unit === 'с'
  const formatValue = (v: number) => (isTime ? formatClock(v) : formatNumber(v))

  return (
    <>
      <SheetHeader className="border-b border-border/60 px-4 pt-4 pb-3">
        <div className="mx-auto -mt-1 mb-2 h-1 w-10 rounded-full bg-muted-foreground/25" aria-hidden />
        <SheetTitle className="font-sans text-lg font-semibold">{progress.name}</SheetTitle>
        <SheetDescription>
          {countLabel(progress.sessions.length, ['тренировка', 'тренировки', 'тренировок'])} в истории
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">Лучший подход</div>
            <div className="mt-0.5 text-lg font-semibold">{progress.bestLabel}</div>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">Расчётный 1ПМ</div>
            <div className="mt-0.5 text-lg font-semibold">
              {progress.bestE1rm != null ? `≈ ${formatNumber(Math.round(progress.bestE1rm))} кг` : '—'}
            </div>
          </div>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">
            {progress.chart.label}
            <span className="font-normal text-muted-foreground">, {isTime ? 'м:сс' : progress.chart.unit}</span>
          </h3>
          <LineChart points={progress.chart.points} format={formatValue} />
          {progress.chart.label === 'Расчётный 1ПМ' && (
            <p className="text-xs text-muted-foreground">
              По формуле Эпли из лучшего подхода до 12 повторений. Ориентир, а не тест на максимум.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">История</h3>
          <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
            {sessions.map((s) => (
              <li key={s.workoutId}>
                <Link to={`/workouts/${s.workoutId}`} className="flex items-center gap-3 px-4 py-3 active:bg-muted/60">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground first-letter:uppercase">
                      {formatDate(s.date, { weekday: false })}
                    </div>
                    <div className="truncate text-sm">{s.summary}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold">{s.bestLabel}</div>
                    {s.e1rm != null && (
                      <div className="text-[11px] text-muted-foreground">≈ 1ПМ {formatNumber(Math.round(s.e1rm))}</div>
                    )}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
