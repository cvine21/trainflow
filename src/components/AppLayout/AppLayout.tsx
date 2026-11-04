import { NavLink, Outlet, useLocation } from 'react-router'
import { CalendarDays, Dumbbell, Users } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/lib/auth'
import { canShowTabBar } from '@/lib/appNav'
import { AuthGate } from '@/components/AuthGate'
import styles from './AppLayout.module.css'

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
    <div className={styles.root}>
      <main className={clsx(styles.main, showNav && styles.mainWithNav)}>
        <AuthGate>
          <Outlet />
        </AuthGate>
      </main>
      {showNav && (
        <nav className={styles.nav}>
          <ul className={styles.tabs}>
            {TABS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to} end className={({ isActive }) => clsx(styles.tab, isActive && styles.tabActive)}>
                  {({ isActive }) => (
                    <>
                      <span className={clsx(styles.iconWrap, isActive && styles.iconWrapActive)}>
                        <Icon className={styles.icon} strokeWidth={isActive ? 2.4 : 2} />
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
