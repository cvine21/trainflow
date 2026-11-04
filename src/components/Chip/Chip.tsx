import clsx from 'clsx'
import styles from './Chip.module.css'

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(styles.chip, active && styles.chipActive, className)}
    >
      {children}
    </button>
  )
}

/** iOS-style segmented control. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  label,
}: {
  value: T
  options: ReadonlyArray<readonly [T, React.ReactNode]>
  onChange: (value: T) => void
  className?: string
  label: string
}) {
  return (
    <div
      className={clsx(styles.segmented, className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="radiogroup"
      aria-label={label}
    >
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={clsx(styles.segment, value === v && styles.segmentActive)}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
