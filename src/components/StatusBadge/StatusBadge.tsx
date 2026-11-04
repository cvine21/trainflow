import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import type { WorkoutStatus } from '@/lib/db'
import { todayISO } from '@/lib/format'
import clsx from 'clsx'
import styles from './StatusBadge.module.css'

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
      className={clsx(
        styles.badge,
        done && styles.done,
        overdue && styles.overdue,
        !done && !overdue && styles.planned,
        className,
      )}
    >
      <Icon className={styles.icon} />
      {done ? 'Проведена' : overdue ? 'Не отмечена' : 'В плане'}
    </span>
  )
}
