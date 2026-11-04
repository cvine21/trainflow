import { LineChart } from '@/components/LineChart'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/Sheet'
import { countLabel, formatClock, formatDate, formatNumber } from '@/lib/format'
import type { ExerciseProgress } from '@/lib/workouts'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import styles from './ExerciseProgressSheet.module.css'

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
      <SheetContent side="bottom" className={styles.sheet}>
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
      <SheetHeader className={styles.header}>
        <div className={styles.handle} aria-hidden />
        <SheetTitle className={styles.title}>{progress.name}</SheetTitle>
        <SheetDescription>
          {countLabel(progress.sessions.length, ['тренировка', 'тренировки', 'тренировок'])} в истории
        </SheetDescription>
      </SheetHeader>

      <div className={styles.body}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Лучший подход</div>
            <div className={styles.statValue}>{progress.bestLabel}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Расчётный 1ПМ</div>
            <div className={styles.statValue}>
              {progress.bestE1rm != null ? `≈ ${formatNumber(Math.round(progress.bestE1rm))} кг` : '—'}
            </div>
          </div>
        </div>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            {progress.chart.label}
            <span className={styles.unit}>, {isTime ? 'м:сс' : progress.chart.unit}</span>
          </h3>
          <LineChart points={progress.chart.points} format={formatValue} />
          {progress.chart.label === 'Расчётный 1ПМ' && (
            <p className={styles.hint}>
              По формуле Эпли из лучшего подхода до 12 повторений. Ориентир, а не тест на максимум.
            </p>
          )}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>История</h3>
          <ul className={styles.history}>
            {sessions.map((s) => (
              <li key={s.workoutId}>
                <Link to={`/workouts/${s.workoutId}`} className={styles.session}>
                  <div className={styles.sessionBody}>
                    <div className={styles.date}>{formatDate(s.date, { weekday: false })}</div>
                    <div className={styles.summary}>{s.summary}</div>
                  </div>
                  <div className={styles.bestCol}>
                    <div className={styles.best}>{s.bestLabel}</div>
                    {s.e1rm != null && <div className={styles.e1rm}>≈ 1ПМ {formatNumber(Math.round(s.e1rm))}</div>}
                  </div>
                  <ChevronRight className={styles.chevron} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
