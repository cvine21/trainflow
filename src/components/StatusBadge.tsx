import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import type { WorkoutStatus } from '@/lib/db'
import { todayISO } from '@/lib/format'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: WorkoutStatus
  date?: string
  className?: string
}

export function StatusBadge({ status, date, className }: StatusBadgeProps) {
  const done = status === 'completed'
  const overdue = !done && !!date && date < todayISO()
  const Icon = done ? CheckCircle2 : overdue ? AlertCircle : Clock
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        done && 'bg-emerald-50 text-emerald-700',
        overdue && 'bg-amber-50 text-amber-700',
        !done && !overdue && 'bg-accent text-accent-foreground',
        className,
      )}
    >
      <Icon className="size-3" />
      {done ? 'Проведена' : overdue ? 'Не отмечена' : 'В плане'}
    </span>
  )
}
