import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import clsx from 'clsx'
import styles from './PageHeader.module.css'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  backTo?: string
  backLabel?: string
  actions?: ReactNode
  large?: boolean
}

export function PageHeader({ title, subtitle, backTo, backLabel = 'Назад', actions, large }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        {backTo ? (
          <Link to={backTo} aria-label={backLabel} className={styles.back}>
            <ChevronLeft className={styles.backIcon} />
          </Link>
        ) : (
          <div className={styles.spacer} />
        )}
        <div className={styles.titles}>
          <h1 className={clsx(styles.title, large && styles.titleLarge)}>{title}</h1>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  )
}
