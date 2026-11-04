import { Input } from '@/components/Input'
import { NumberInput } from '@/components/Workout/NumberInput'
import { StepperRow } from '@/components/Workout/Stepper'
import type { BlockResult, WorkoutBlock } from '@/lib/db'
import { emomIntervals, formatBlockResult, hasResult } from '@/lib/workouts'
import { Trophy } from 'lucide-react'
import styles from './BlockResult.module.css'

export function BlockResultSection({
  block,
  editable,
  onChange,
}: {
  block: WorkoutBlock
  editable: boolean
  onChange: (result: BlockResult) => void
}) {
  const r = block.result ?? {}
  const set = (patch: Partial<BlockResult>) => onChange({ ...r, ...patch })

  if (!editable) {
    if (!hasResult(block)) return null
    return (
      <div className={styles.result}>
        <Trophy className={styles.trophy} />
        <span className={styles.resultText}>
          Результат: <span className={styles.resultValue}>{formatBlockResult(block)}</span>
        </span>
      </div>
    )
  }

  const total = emomIntervals(block)
  return (
    <div className={styles.editor}>
      <div className={styles.editorTitle}>
        <Trophy className={styles.editorIcon} /> Результат
      </div>
      {block.format === 'amrap' && (
        <>
          <StepperRow label="Раунды" value={r.rounds ?? null} onChange={(rounds) => set({ rounds })} step={1} />
          <StepperRow label="+ повторы" value={r.reps ?? null} onChange={(reps) => set({ reps })} step={1} />
        </>
      )}
      {block.format === 'emom' && (
        <StepperRow
          label="Выполнено"
          value={r.rounds ?? null}
          onChange={(rounds) => set({ rounds: total && rounds != null ? Math.min(rounds, total) : rounds })}
          step={1}
          suffix={total ? `из ${total}` : undefined}
        />
      )}
      {(block.format === 'fortime' || block.format === 'rounds') && (
        <div className={styles.timeRow}>
          <span className={styles.timeLabel}>Время</span>
          <NumberInput
            value={r.timeSec ?? null}
            onChange={(timeSec) => set({ timeSec })}
            duration
            placeholder="м:сс"
            label="Время выполнения"
            className={styles.timeInput}
          />
        </div>
      )}
      <Input
        value={r.note ?? ''}
        onChange={(e) => set({ note: e.target.value })}
        placeholder={block.format === 'fortime' ? 'Например: не уложился, +10 повт.' : 'Комментарий к результату'}
        className={styles.noteInput}
      />
    </div>
  )
}
