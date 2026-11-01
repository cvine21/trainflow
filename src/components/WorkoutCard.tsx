import { Link } from 'react-router'
import { ChevronRight, MessageSquareText } from 'lucide-react'
import type { Workout } from '@/lib/db'
import { countLabel, formatDate, formatNumber } from '@/lib/format'
import { workoutTonnage } from '@/lib/workouts'
import { StatusBadge } from '@/components/StatusBadge'
import { cn } from '@/lib/utils'

interface WorkoutCardProps {
  workout: Workout
  clientName?: string
  showStatus?: boolean
}

export function WorkoutCard({ workout, clientName, showStatus = true }: WorkoutCardProps) {
  const tonnage = workoutTonnage(workout)
  const names = workout.exercises.map((e) => e.name)
  const preview = names.slice(0, 3).join(' · ') + (names.length > 3 ? ` +${names.length - 3}` : '')

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
          <span className="capitalize">{formatDate(workout.date)}</span>
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
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {names.length ? preview : 'Упражнения не добавлены'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{countLabel(workout.exercises.length, ['упражнение', 'упражнения', 'упражнений'])}</span>
          {tonnage > 0 && <span>{formatNumber(tonnage)} кг тоннаж</span>}
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
