import { cn } from '@/lib/utils'

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
      className={cn(
        'h-8 shrink-0 rounded-full border px-3 text-sm whitespace-nowrap transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground/80 active:bg-muted',
        className,
      )}
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
      className={cn('grid gap-1 rounded-xl bg-muted p-1', className)}
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
          className={cn(
            'flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors',
            value === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
          )}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
