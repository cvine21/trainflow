import { BlockResultSection } from '@/components/Workout/BlockResult'
import { ActionsMenu, ExerciseItem, type MenuAction } from '@/components/Workout/ExerciseItem'
import type { BlockResult, WorkoutBlock, WorkoutExercise } from '@/lib/db'
import { BLOCK_FORMATS, blockTitle, isCircuit } from '@/lib/workouts'
import { ArrowDown, ArrowUp, Link2, Plus, Repeat, Settings2, SquareSplitVertical, Trash2 } from 'lucide-react'
import styles from './BlockCard.module.css'

function blockLetter(index: number): string {
  return String.fromCharCode(65 + (index % 26))
}

interface BlockCardProps {
  block: WorkoutBlock
  index: number
  total: number
  canMergeNext: boolean
  editable: boolean
  onChange: (block: WorkoutBlock) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
  onMergeNext: () => void
  onEditFormat: () => void
  onAddExercise: () => void
  onReplaceExercise: (exerciseId: string) => void
  onSplitExercise: (exerciseId: string) => void
}

export function BlockCard({
  block,
  index,
  total,
  canMergeNext,
  editable,
  onChange,
  onRemove,
  onMove,
  onMergeNext,
  onEditFormat,
  onAddExercise,
  onReplaceExercise,
  onSplitExercise,
}: BlockCardProps) {
  const letter = blockLetter(index)
  const circuit = isCircuit(block.format)

  const updateExercise = (ex: WorkoutExercise) =>
    onChange({ ...block, exercises: block.exercises.map((e) => (e.id === ex.id ? ex : e)) })
  const removeExercise = (id: string) => {
    if (block.exercises.length <= 1) onRemove()
    else onChange({ ...block, exercises: block.exercises.filter((e) => e.id !== id) })
  }
  const moveExercise = (i: number, dir: -1 | 1) => {
    const next = [...block.exercises]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    onChange({ ...block, exercises: next })
  }

  const blockMoves: MenuAction[] = [
    { label: 'Переместить выше', icon: ArrowUp, onClick: () => onMove(-1), disabled: index === 0 },
    { label: 'Переместить ниже', icon: ArrowDown, onClick: () => onMove(1), disabled: index === total - 1 },
  ]

  if (block.format === 'sets' && block.exercises.length <= 1) {
    const ex = block.exercises[0]
    if (!ex) return null
    return (
      <ExerciseItem
        exercise={ex}
        label={letter}
        variant="card"
        editable={editable}
        onChange={updateExercise}
        onReplace={() => onReplaceExercise(ex.id)}
        actions={[
          ...blockMoves,
          ...(canMergeNext ? [{ label: 'Суперсет со следующим', icon: Link2, onClick: onMergeNext }] : []),
          { label: 'Круг, EMOM, AMRAP…', icon: Repeat, onClick: onEditFormat },
          { label: 'Удалить упражнение', icon: Trash2, onClick: onRemove, destructive: true, separatorBefore: true },
        ]}
      />
    )
  }

  const singleLabel = block.format === 'emom' ? 'Интервал' : 'За раунд'

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <span className={styles.letter}>{letter}</span>
        <button
          type="button"
          onClick={editable ? onEditFormat : undefined}
          disabled={!editable}
          className={styles.titleButton}
        >
          <span className={styles.title}>{blockTitle(block)}</span>
          <span className={styles.description}>{BLOCK_FORMATS[block.format].description}</span>
        </button>
        {editable && (
          <ActionsMenu
            label="Действия с блоком"
            actions={[
              { label: 'Формат и параметры', icon: Settings2, onClick: onEditFormat },
              ...blockMoves,
              ...(canMergeNext && !circuit
                ? [{ label: 'Добавить следующее в суперсет', icon: Link2, onClick: onMergeNext }]
                : []),
              { label: 'Удалить блок', icon: Trash2, onClick: onRemove, destructive: true, separatorBefore: true },
            ]}
          />
        )}
      </div>

      <div className={styles.exercises}>
        {block.exercises.map((ex, i) => (
          <ExerciseItem
            key={ex.id}
            exercise={ex}
            label={`${letter}${i + 1}`}
            variant="nested"
            single={circuit ? singleLabel : undefined}
            editable={editable}
            onChange={updateExercise}
            onReplace={() => onReplaceExercise(ex.id)}
            actions={[
              { label: 'Выше в блоке', icon: ArrowUp, onClick: () => moveExercise(i, -1), disabled: i === 0 },
              {
                label: 'Ниже в блоке',
                icon: ArrowDown,
                onClick: () => moveExercise(i, 1),
                disabled: i === block.exercises.length - 1,
              },
              ...(block.exercises.length > 1
                ? [{ label: 'Вынести из блока', icon: SquareSplitVertical, onClick: () => onSplitExercise(ex.id) }]
                : []),
              {
                label: 'Убрать из блока',
                icon: Trash2,
                onClick: () => removeExercise(ex.id),
                destructive: true,
                separatorBefore: true,
              },
            ]}
          />
        ))}
        {!block.exercises.length && <p className={styles.empty}>В блоке пока нет упражнений</p>}
      </div>

      {editable && (
        <div className={styles.addWrap}>
          <button type="button" onClick={onAddExercise} className={styles.add}>
            <Plus className={styles.icon} /> Упражнение в блок
          </button>
        </div>
      )}

      {circuit && (
        <BlockResultSection
          block={block}
          editable={editable}
          onChange={(result: BlockResult) => onChange({ ...block, result })}
        />
      )}
    </section>
  )
}
