import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { formatClock, formatNumber, parseDuration, parseNumber } from '@/lib/format'
import styles from './NumberInput.module.css'

function toText(value: number | null, duration?: boolean): string {
  if (value == null) return ''
  return duration ? formatClock(value) : formatNumber(value).replace(/\s/g, '')
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  decimal,
  duration,
  autoFocus,
  label,
  className,
}: {
  value: number | null
  onChange: (value: number | null) => void
  placeholder?: string
  decimal?: boolean
  /** Seconds, typed as "90" or "1:30" and shown as "1:30". */
  duration?: boolean
  autoFocus?: boolean
  label: string
  className?: string
}) {
  const parse = duration ? parseDuration : parseNumber
  const [text, setText] = useState(() => toText(value, duration))

  useEffect(() => {
    if (parse(text) !== value) setText(toText(value, duration))
    // Only external changes (± buttons, "Повторить") should overwrite what the user is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <input
      type="text"
      inputMode={duration || decimal ? 'decimal' : 'numeric'}
      value={text}
      placeholder={placeholder}
      aria-label={label}
      autoFocus={autoFocus}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => setText(toText(value, duration))}
      onChange={(e) => {
        setText(e.target.value)
        onChange(parse(e.target.value))
      }}
      className={clsx(styles.input, className)}
    />
  )
}
