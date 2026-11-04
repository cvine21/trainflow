import { Link } from 'react-router'
import { ChevronRight, MessageSquareText } from 'lucide-react'
import clsx from 'clsx'
import type { Workout } from '@/lib/db'
import { countLabel } from '@/lib/format'
import { allExercises, formatWhen, workoutPreview } from '@/lib/workouts'
import { StatusBadge } from '@/components/StatusBadge'
import styles from './WorkoutCard.module.css'

interface WorkoutCardProps {
  workout: Workout
  clientName?: string
  showStatus?: boolean
}

export function WorkoutCard({ workout, clientName, showStatus = true }: WorkoutCardProps) {
  const exerciseCount = allExercises(workout).length
  const circuits = workout.blocks.filter((b) => b.format !== 'sets').length

  return (
    <Link to={`/workouts/${workout.id}`} className={clsx(styles.card, workout.status === 'planned' && styles.planned)}>
      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.when}>{formatWhen(workout)}</span>
          {clientName && (
            <>
              <span aria-hidden>·</span>
              <span className={styles.client}>{clientName}</span>
            </>
          )}
        </div>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{workout.title || 'Тренировка'}</h3>
          {showStatus && <StatusBadge status={workout.status} date={workout.date} />}
        </div>
        <p className={styles.preview}>{exerciseCount ? workoutPreview(workout) : 'Упражнения не добавлены'}</p>
        <div className={styles.stats}>
          <span>{countLabel(exerciseCount, ['упражнение', 'упражнения', 'упражнений'])}</span>
          {circuits > 0 && <span>{countLabel(circuits, ['блок', 'блока', 'блоков'])}</span>}
          {workout.notes?.trim() && (
            <span className={styles.note}>
              <MessageSquareText className={styles.noteIcon} /> заметка
            </span>
          )}
        </div>
      </div>
      <ChevronRight className={styles.chevron} />
    </Link>
  )
}
