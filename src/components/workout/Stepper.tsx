import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import type { Metric } from '@/lib/db'
import { BAND_COLORS, BAND_LEVELS, METRIC_LABELS } from '@/lib/workouts'
import { NumberInput } from '@/components/workout/NumberInput'
import { cn } from '@/lib/utils'

const round = (n: number) => Math.round(n * 100) / 100

const stepButton =
  'flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-colors active:bg-accent active:text-accent-foreground disabled:opacity-40'

export function StepperRow({
  label,
  value,
  onChange,
  step,
  min = 0,
  decimal,
  duration,
  placeholder,
  suffix,
}: {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  step: number
  min?: number
  decimal?: boolean
  duration?: boolean
  placeholder?: string
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-sm leading-tight text-muted-foreground">{label}</span>
      <button
        type="button"
        className={stepButton}
        onClick={() => onChange(value == null ? null : Math.max(min, round(value - step)))}
        disabled={value == null || value <= min}
        aria-label={`${label}: меньше`}
      >
        <Minus className="size-5" />
      </button>
      <div className="relative min-w-0 flex-1">
        <NumberInput
          value={value}
          onChange={onChange}
          decimal={decimal}
          duration={duration}
          placeholder={placeholder}
          label={label}
          className={cn('h-11 text-lg font-semibold', suffix && 'px-10')}
        />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      <button
        type="button"
        className={stepButton}
        onClick={() => onChange(round(Math.max(min, (value ?? min) + step)))}
        aria-label={`${label}: больше`}
      >
        <Plus className="size-5" />
      </button>
    </div>
  )
}

const STEP: Record<Exclude<Metric, 'band'>, number> = { reps: 1, weight: 2.5, time: 5, distance: 10, calories: 1 }

export function MetricStepper({
  metric,
  value,
  onChange,
}: {
  metric: Exclude<Metric, 'band'>
  value: number | null
  onChange: (value: number | null) => void
}) {
  return (
    <StepperRow
      label={METRIC_LABELS[metric].full}
      value={value}
      onChange={onChange}
      step={STEP[metric]}
      decimal={metric === 'weight' || metric === 'distance'}
      duration={metric === 'time'}
      placeholder={metric === 'time' ? '0:00' : '—'}
    />
  )
}

export function BandStepper({ value, onChange }: { value: string | null; onChange: (value: string | null) => void }) {
  const index = BAND_LEVELS.findIndex((b) => b === value)
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-sm leading-tight text-muted-foreground">Резина</span>
      <button
        type="button"
        className={stepButton}
        onClick={() => onChange(index > 0 ? BAND_LEVELS[index - 1]! : null)}
        disabled={index < 0}
        aria-label="Резина легче"
      >
        <ChevronLeft className="size-5" />
      </button>
      <div className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-input bg-background px-2 text-base font-semibold">
        {value ? (
          <>
            <span className="size-3 shrink-0 rounded-full" style={{ background: BAND_COLORS[value] }} />
            <span className="truncate">{value}</span>
          </>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </div>
      <button
        type="button"
        className={stepButton}
        onClick={() => onChange(BAND_LEVELS[Math.min(index + 1, BAND_LEVELS.length - 1)]!)}
        disabled={index === BAND_LEVELS.length - 1}
        aria-label="Резина тяжелее"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  )
}
