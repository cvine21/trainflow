import { Button } from '@/components/Button'
import { Segmented } from '@/components/Chip'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/Sheet'
import { StepperRow } from '@/components/Workout/Stepper'
import type { BlockFormat, WorkoutBlock } from '@/lib/db'
import { BLOCK_FORMAT_ORDER, BLOCK_FORMATS, blockDefaults, blockTitle } from '@/lib/workouts'
import clsx from 'clsx'
import { Check } from 'lucide-react'
import { useState } from 'react'
import styles from './BlockFormatSheet.module.css'

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
      <SheetContent side="bottom" className={styles.sheet}>
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
      <SheetHeader className={styles.header}>
        <div className={styles.handle} aria-hidden />
        <SheetTitle className={styles.title}>{mode === 'new' ? 'Новый блок' : 'Формат блока'}</SheetTitle>
        <SheetDescription>Суперсеты, круги и комплексы с результатом</SheetDescription>
      </SheetHeader>

      <div className={styles.body}>
        <div className={styles.formats} role="radiogroup" aria-label="Формат">
          {formats.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={params.format === f}
              onClick={() => choose(f)}
              className={clsx(styles.formatOption, params.format === f && styles.formatOptionSelected)}
            >
              <span className={styles.formatLabel}>{BLOCK_FORMATS[f].label}</span>
              <span className={styles.formatDescription}>{BLOCK_FORMATS[f].description}</span>
              {params.format === f && <Check className={styles.check} />}
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
          <div className={styles.interval}>
            <span className={styles.intervalLabel}>Интервал</span>
            <Segmented
              label="Интервал"
              value={String(params.intervalSec ?? 60) as (typeof INTERVALS)[number][0]}
              options={INTERVALS}
              onChange={(v) => set({ intervalSec: Number(v) })}
            />
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <Button className={styles.save} onClick={() => onSave(params)}>
          {mode === 'new' ? `Добавить: ${blockTitle(params)}` : 'Сохранить'}
        </Button>
      </div>
    </>
  )
}
