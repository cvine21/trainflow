import { Trophy } from 'lucide-react'
import type { BlockResult, WorkoutBlock } from '@/lib/db'
import { emomIntervals, formatBlockResult, hasResult } from '@/lib/workouts'
import { NumberInput } from '@/components/workout/NumberInput'
import { StepperRow } from '@/components/workout/Stepper'
import { Input } from '@/components/ui/input'

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
      <div className="mx-3 mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
        <Trophy className="size-4 shrink-0 text-emerald-600" />
        <span className="min-w-0">
          Результат: <span className="font-semibold">{formatBlockResult(block)}</span>
        </span>
      </div>
    )
  }

  const total = emomIntervals(block)
  return (
    <div className="mx-3 mb-3 flex flex-col gap-2 rounded-xl border border-dashed border-border p-3">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <Trophy className="size-4 text-primary" /> Результат
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
        <div className="flex items-center gap-2">
          <span className="w-20 shrink-0 text-sm text-muted-foreground">Время</span>
          <NumberInput
            value={r.timeSec ?? null}
            onChange={(timeSec) => set({ timeSec })}
            duration
            placeholder="м:сс"
            label="Время выполнения"
            className="h-11 text-lg font-semibold"
          />
        </div>
      )}
      <Input
        value={r.note ?? ''}
        onChange={(e) => set({ note: e.target.value })}
        placeholder={block.format === 'fortime' ? 'Например: не уложился, +10 повт.' : 'Комментарий к результату'}
        className="h-10"
      />
    </div>
  )
}
