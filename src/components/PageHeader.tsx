import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <header className="pt-safe sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="flex min-h-14 items-center gap-1 px-2">
        {backTo ? (
          <Link
            to={backTo}
            aria-label={backLabel}
            className="-ml-0.5 flex size-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors active:bg-muted"
          >
            <ChevronLeft className="size-6" />
          </Link>
        ) : (
          <div className="w-2" />
        )}
        <div className="min-w-0 flex-1 py-2">
          <h1 className={cn('truncate font-semibold tracking-tight', large ? 'text-2xl' : 'text-lg')}>{title}</h1>
          {subtitle && <div className="truncate text-sm text-muted-foreground">{subtitle}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1 pr-1">{actions}</div>}
      </div>
    </header>
  )
}
