import { NavLink, Outlet, useLocation } from 'react-router'
import { CalendarDays, Dumbbell, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { canShowTabBar } from '@/lib/appNav'
import { AuthGate } from '@/components/AuthGate'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/', label: 'Клиенты', icon: Users },
  { to: '/workouts', label: 'Тренировки', icon: CalendarDays },
  { to: '/exercises', label: 'Упражнения', icon: Dumbbell },
]

const TAB_PATHS = new Set(TABS.map((t) => t.to))

export function AppLayout() {
  const { pathname } = useLocation()
  const { configured, loading, user } = useAuth()
  const showNav = canShowTabBar({
    pathname,
    tabPaths: TAB_PATHS,
    configured,
    loading,
    signedIn: !!user,
  })


  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background sm:border-x sm:border-border/60 sm:shadow-sm">
      <main className={cn('flex flex-1 flex-col', showNav && 'pb-20')}>
        <AuthGate>
          <Outlet />
        </AuthGate>
      </main>
      {showNav && (
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-lg border-t border-border/60 bg-background/90 backdrop-blur-md">
          <ul className="grid grid-cols-3">
            {TABS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end
                  className={({ isActive }) =>
                    cn(
                      'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground active:text-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                          isActive && 'bg-accent',
                        )}
                      >
                        <Icon className="size-5" strokeWidth={isActive ? 2.4 : 2} />
                      </span>
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
