import { Link } from 'react-router'
import { ChevronRight, MessageSquareText } from 'lucide-react'
import type { Workout } from '@/lib/db'
import { countLabel } from '@/lib/format'
import { allExercises, formatWhen, workoutPreview } from '@/lib/workouts'
import { StatusBadge } from '@/components/StatusBadge'
import { cn } from '@/lib/utils'

interface WorkoutCardProps {
  workout: Workout
  clientName?: string
  showStatus?: boolean
}

export function WorkoutCard({ workout, clientName, showStatus = true }: WorkoutCardProps) {
  const exerciseCount = allExercises(workout).length
  const circuits = workout.blocks.filter((b) => b.format !== 'sets').length

  return (
    <Link
      to={`/workouts/${workout.id}`}
      className={cn(
        'group flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 transition-colors active:bg-muted/60',
        workout.status === 'planned' && 'border-l-4 border-l-primary/70',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="first-letter:uppercase">{formatWhen(workout)}</span>
          {clientName && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate text-foreground/80">{clientName}</span>
            </>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <h3 className="truncate font-semibold">{workout.title || 'Тренировка'}</h3>
          {showStatus && <StatusBadge status={workout.status} date={workout.date} />}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {exerciseCount ? workoutPreview(workout) : 'Упражнения не добавлены'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{countLabel(exerciseCount, ['упражнение', 'упражнения', 'упражнений'])}</span>
          {circuits > 0 && <span>{countLabel(circuits, ['блок', 'блока', 'блоков'])}</span>}
          {workout.notes?.trim() && (
            <span className="inline-flex items-center gap-1">
              <MessageSquareText className="size-3.5" /> заметка
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground/60" />
    </Link>
  )
}
