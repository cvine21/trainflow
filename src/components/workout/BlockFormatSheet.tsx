import { useState } from 'react'
import { Check } from 'lucide-react'
import type { BlockFormat, WorkoutBlock } from '@/lib/db'
import { BLOCK_FORMAT_ORDER, BLOCK_FORMATS, blockDefaults, blockTitle } from '@/lib/workouts'
import { Segmented } from '@/components/Chip'
import { StepperRow } from '@/components/workout/Stepper'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export type BlockParams = Pick<WorkoutBlock, 'format' | 'rounds' | 'durationSec' | 'intervalSec'>

const INTERVALS = [
  ['30', '30 с'],
  ['60', '1 мин'],
  ['120', '2 мин'],
  ['180', '3 мин'],
] as const

interface BlockFormatSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'new' | 'edit'
  initial?: BlockParams
  onSave: (params: BlockParams) => void
}

export function BlockFormatSheet({ open, onOpenChange, mode, initial, onSave }: BlockFormatSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-lg gap-0 rounded-t-3xl p-0">
        {open && (
          <BlockForm
            mode={mode}
            initial={initial}
            onSave={(params) => {
              onSave(params)
              onOpenChange(false)
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function BlockForm({ mode, initial, onSave }: Pick<BlockFormatSheetProps, 'mode' | 'initial' | 'onSave'>) {
  const [params, setParams] = useState<BlockParams>(() =>
    initial ? { ...blockDefaults(initial.format), ...initial } : { format: 'rounds', ...blockDefaults('rounds') },
  )
  const formats = mode === 'new' ? BLOCK_FORMAT_ORDER.filter((f) => f !== 'sets') : BLOCK_FORMAT_ORDER
  const set = (patch: Partial<BlockParams>) => setParams((p) => ({ ...p, ...patch }))
  const choose = (format: BlockFormat) =>
    setParams(
      initial?.format === format ? { ...blockDefaults(format), ...initial } : { format, ...blockDefaults(format) },
    )

  const minutes = params.durationSec != null ? params.durationSec / 60 : null
  const setMinutes = (v: number | null) => set({ durationSec: v ? Math.round(v * 60) : null })

  return (
    <>
      <SheetHeader className="border-b border-border/60 px-4 pt-4 pb-3">
        <div className="mx-auto -mt-1 mb-2 h-1 w-10 rounded-full bg-muted-foreground/25" aria-hidden />
        <SheetTitle className="font-sans text-lg font-semibold">
          {mode === 'new' ? 'Новый блок' : 'Формат блока'}
        </SheetTitle>
        <SheetDescription>Суперсеты, круги и комплексы с результатом</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Формат">
          {formats.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={params.format === f}
              onClick={() => choose(f)}
              className={cn(
                'relative flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors',
                params.format === f ? 'border-primary bg-accent/60' : 'border-border bg-card active:bg-muted',
              )}
            >
              <span className="font-semibold">{BLOCK_FORMATS[f].label}</span>
              <span className="text-xs leading-snug text-muted-foreground">{BLOCK_FORMATS[f].description}</span>
              {params.format === f && <Check className="absolute top-3 right-3 size-4 text-primary" />}
            </button>
          ))}
        </div>

        {(params.format === 'rounds' || params.format === 'fortime') && (
          <StepperRow
            label="Раунды"
            value={params.rounds ?? null}
            onChange={(rounds) => set({ rounds })}
            step={1}
            min={1}
          />
        )}
        {(params.format === 'emom' || params.format === 'amrap') && (
          <StepperRow label="Всего" value={minutes} onChange={setMinutes} step={1} min={1} suffix="мин" />
        )}
        {params.format === 'fortime' && (
          <StepperRow label="Лимит" value={minutes} onChange={setMinutes} step={1} placeholder="нет" suffix="мин" />
        )}
        {params.format === 'emom' && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">Интервал</span>
            <Segmented
              label="Интервал"
              value={String(params.intervalSec ?? 60) as (typeof INTERVALS)[number][0]}
              options={INTERVALS}
              onChange={(v) => set({ intervalSec: Number(v) })}
            />
          </div>
        )}
      </div>

      <div className="pb-safe border-t border-border/60 px-4 pt-3">
        <Button className="mb-3 h-12 w-full text-base" onClick={() => onSave(params)}>
          {mode === 'new' ? `Добавить: ${blockTitle(params)}` : 'Сохранить'}
        </Button>
      </div>
    </>
  )
}
