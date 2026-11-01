import { ArrowDown, ArrowUp, Link2, Plus, Repeat, Settings2, SquareSplitVertical, Trash2 } from 'lucide-react'
import type { BlockResult, WorkoutBlock, WorkoutExercise } from '@/lib/db'
import { BLOCK_FORMATS, blockTitle, isCircuit } from '@/lib/workouts'
import { BlockResultSection } from '@/components/workout/BlockResult'
import { ActionsMenu, ExerciseItem, type MenuAction } from '@/components/workout/ExerciseItem'

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
    <section className="rounded-2xl border border-border/70 bg-card">
      <div className="flex items-center gap-2.5 py-1.5 pr-1.5 pl-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {letter}
        </span>
        <button
          type="button"
          onClick={editable ? onEditFormat : undefined}
          disabled={!editable}
          className="min-w-0 flex-1 py-1 text-left disabled:cursor-default"
        >
          <span className="block truncate font-semibold">{blockTitle(block)}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {BLOCK_FORMATS[block.format].description}
          </span>
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

      <div className="divide-y divide-border/60 border-t border-border/60">
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
        {!block.exercises.length && (
          <p className="px-4 py-4 text-center text-sm text-muted-foreground">В блоке пока нет упражнений</p>
        )}
      </div>

      {editable && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={onAddExercise}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground active:bg-muted"
          >
            <Plus className="size-4" /> Упражнение в блок
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
