import { NumberInput } from '@/components/Workout/NumberInput'
import type { Metric } from '@/lib/db'
import { BAND_COLORS, BAND_LEVELS, METRIC_LABELS } from '@/lib/workouts'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import styles from './Stepper.module.css'

const round = (n: number) => Math.round(n * 100) / 100

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
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <button
        type="button"
        className={styles.step}
        onClick={() => onChange(value == null ? null : Math.max(min, round(value - step)))}
        disabled={value == null || value <= min}
        aria-label={`${label}: меньше`}
      >
        <Minus className={styles.icon} />
      </button>
      <div className={styles.valueWrap}>
        <NumberInput
          value={value}
          onChange={onChange}
          decimal={decimal}
          duration={duration}
          placeholder={placeholder}
          label={label}
          className={clsx(styles.valueInput, suffix && styles.valueInputSuffix)}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </div>
      <button
        type="button"
        className={styles.step}
        onClick={() => onChange(round(Math.max(min, (value ?? min) + step)))}
        aria-label={`${label}: больше`}
      >
        <Plus className={styles.icon} />
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
    <div className={styles.row}>
      <span className={styles.label}>Резина</span>
      <button
        type="button"
        className={styles.step}
        onClick={() => onChange(index > 0 ? BAND_LEVELS[index - 1]! : null)}
        disabled={index < 0}
        aria-label="Резина легче"
      >
        <ChevronLeft className={styles.icon} />
      </button>
      <div className={styles.bandValue}>
        {value ? (
          <>
            <span className={styles.swatch} style={{ background: BAND_COLORS[value] }} />
            <span className={styles.bandName}>{value}</span>
          </>
        ) : (
          <span className={styles.bandEmpty}>—</span>
        )}
      </div>
      <button
        type="button"
        className={styles.step}
        onClick={() => onChange(BAND_LEVELS[Math.min(index + 1, BAND_LEVELS.length - 1)]!)}
        disabled={index === BAND_LEVELS.length - 1}
        aria-label="Резина тяжелее"
      >
        <ChevronRight className={styles.icon} />
      </button>
    </div>
  )
}
