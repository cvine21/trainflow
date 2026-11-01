import { Fragment, useState } from 'react'
import { ArrowLeftRight, MessageSquarePlus, MoreVertical, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import type { WorkoutExercise } from '@/lib/db'
import { formatClock } from '@/lib/format'
import { emptySet, isBodyweight } from '@/lib/workouts'
import { MetricsPicker } from '@/components/MetricsPicker'
import { SetList } from '@/components/workout/SetList'
import { StepperRow } from '@/components/workout/Stepper'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface MenuAction {
  label: string
  icon: LucideIcon
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
  separatorBefore?: boolean
}

export function ActionsMenu({ actions, label }: { actions: MenuAction[]; label: string }) {
  if (!actions.length) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-lg" className="shrink-0 rounded-full" aria-label={label} />}
      >
        <MoreVertical className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {actions.map(({ label: text, icon: Icon, onClick, destructive, disabled, separatorBefore }) => (
          <Fragment key={text}>
            {separatorBefore && <DropdownMenuSeparator />}
            <DropdownMenuItem
              className="h-10"
              variant={destructive ? 'destructive' : 'default'}
              disabled={disabled}
              onClick={onClick}
            >
              <Icon /> {text}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ExerciseItemProps {
  exercise: WorkoutExercise
  label: string
  variant: 'card' | 'nested'
  /** Circuit formats keep one prescription per exercise instead of sets. */
  single?: string
  editable: boolean
  onChange: (exercise: WorkoutExercise) => void
  onReplace?: () => void
  actions?: MenuAction[]
}

export function ExerciseItem({
  exercise,
  label,
  variant,
  single,
  editable,
  onChange,
  onReplace,
  actions = [],
}: ExerciseItemProps) {
  // Stable id so typing into an empty circuit row doesn't remount the input.
  const [blankSet] = useState(emptySet)
  const [showSettings, setShowSettings] = useState(false)
  const [showNote, setShowNote] = useState(false)

  const update = (patch: Partial<WorkoutExercise>) => onChange({ ...exercise, ...patch })

  const sets = single ? (exercise.sets.length ? exercise.sets.slice(0, 1) : editable ? [blankSet] : []) : exercise.sets
  const tags = [
    isBodyweight(exercise.metrics) && 'свой вес',
    !single && exercise.restSec ? `отдых ${formatClock(exercise.restSec)}` : null,
  ].filter(Boolean)
  const noteVisible = showNote || !!exercise.note?.trim()

  const menu: MenuAction[] = editable
    ? [
        ...(onReplace ? [{ label: 'Заменить упражнение', icon: ArrowLeftRight, onClick: onReplace }] : []),
        { label: 'Нагрузка и метрики', icon: SlidersHorizontal, onClick: () => setShowSettings((v) => !v) },
        ...(!noteVisible ? [{ label: 'Комментарий', icon: MessageSquarePlus, onClick: () => setShowNote(true) }] : []),
        ...actions,
      ]
    : []

  return (
    <div className={cn(variant === 'card' ? 'rounded-2xl border border-border/70 bg-card' : 'py-1')}>
      <div className="flex items-center gap-2.5 py-1.5 pr-1.5 pl-3">
        <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-foreground">
          {label}
        </span>
        <button
          type="button"
          onClick={editable ? onReplace : undefined}
          disabled={!editable || !onReplace}
          className="min-w-0 flex-1 py-1 text-left disabled:cursor-default"
        >
          <span className="block truncate font-semibold">{exercise.name || 'Упражнение'}</span>
          {tags.length > 0 && <span className="block text-xs text-muted-foreground">{tags.join(' · ')}</span>}
        </button>
        <ActionsMenu actions={menu} label={`Действия: ${exercise.name}`} />
      </div>

      {editable && showSettings && (
        <div className="mx-3 mb-2 flex flex-col gap-3 rounded-xl border border-border/70 p-3">
          <MetricsPicker metrics={exercise.metrics} onChange={(metrics) => update({ metrics })} />
          {!single && (
            <StepperRow
              label="Отдых"
              value={exercise.restSec ?? null}
              onChange={(restSec) => update({ restSec })}
              step={15}
              duration
              placeholder="0:00"
            />
          )}
        </div>
      )}

      <div className="px-1.5 pb-1.5">
        {!sets.length && !single && <p className="px-2 py-2 text-sm text-muted-foreground">Подходы не указаны</p>}
        <SetList
          sets={sets}
          metrics={exercise.metrics}
          single={single}
          editable={editable}
          onChange={(next) => update({ sets: next })}
        />
      </div>

      {noteVisible &&
        (editable ? (
          <div className="px-3 pb-3">
            <Textarea
              value={exercise.note ?? ''}
              onChange={(e) => update({ note: e.target.value })}
              placeholder="Техника, акценты, темп, ощущения клиента…"
              rows={2}
              className="min-h-12"
              autoFocus={showNote && !exercise.note}
            />
          </div>
        ) : (
          <p className="mx-3 mb-3 rounded-xl bg-muted/70 px-3 py-2 text-sm whitespace-pre-wrap text-muted-foreground">
            {exercise.note}
          </p>
        ))}
    </div>
  )
}
