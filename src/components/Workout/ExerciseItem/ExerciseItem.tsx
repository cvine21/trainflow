import { Button } from '@/components/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu'
import { MetricsPicker } from '@/components/MetricsPicker'
import { Textarea } from '@/components/Textarea'
import { SetList } from '@/components/Workout/SetList'
import { StepperRow } from '@/components/Workout/Stepper'
import type { WorkoutExercise } from '@/lib/db'
import { formatClock } from '@/lib/format'
import { emptySet, isBodyweight } from '@/lib/workouts'
import { ArrowLeftRight, MessageSquarePlus, MoreVertical, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { Fragment, useState } from 'react'
import styles from './ExerciseItem.module.css'

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
        render={<Button variant="ghost" size="icon-lg" className={styles.menuTrigger} aria-label={label} />}
      >
        <MoreVertical className={styles.menuIcon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={styles.menu}>
        {actions.map(({ label: text, icon: Icon, onClick, destructive, disabled, separatorBefore }) => (
          <Fragment key={text}>
            {separatorBefore && <DropdownMenuSeparator />}
            <DropdownMenuItem
              className={styles.menuItem}
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
    <div className={variant === 'card' ? styles.card : styles.nested}>
      <div className={styles.head}>
        <span className={styles.badge}>{label}</span>
        <button
          type="button"
          onClick={editable ? onReplace : undefined}
          disabled={!editable || !onReplace}
          className={styles.titleButton}
        >
          <span className={styles.name}>{exercise.name || 'Упражнение'}</span>
          {tags.length > 0 && <span className={styles.tags}>{tags.join(' · ')}</span>}
        </button>
        <ActionsMenu actions={menu} label={`Действия: ${exercise.name}`} />
      </div>

      {editable && showSettings && (
        <div className={styles.settings}>
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

      <div className={styles.sets}>
        {!sets.length && !single && <p className={styles.emptySets}>Подходы не указаны</p>}
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
          <div className={styles.noteWrap}>
            <Textarea
              value={exercise.note ?? ''}
              onChange={(e) => update({ note: e.target.value })}
              placeholder="Техника, акценты, темп, ощущения клиента…"
              rows={2}
              className={styles.noteInput}
              autoFocus={showNote && !exercise.note}
            />
          </div>
        ) : (
          <p className={styles.note}>{exercise.note}</p>
        ))}
    </div>
  )
}
