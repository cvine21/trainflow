import { NumberInput } from '@/components/Workout/NumberInput'
import clsx from 'clsx'
import { Minus, Plus } from 'lucide-react'
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
