import { buttonVariants } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { WorkoutCard } from '@/components/WorkoutCard'
import { db, type Workout } from '@/lib/db'
import { todayISO } from '@/lib/format'
import { compareWorkouts } from '@/lib/workouts'
import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import styles from './WorkoutsPage.module.css'

const RECENT_LIMIT = 30

export function WorkoutsPage() {
  const workouts = useLiveQuery(async () => (await db.workouts.toArray()).sort(compareWorkouts), [])
  const clients = useLiveQuery(() => db.clients.toArray(), [])

  const names = useMemo(() => new Map((clients ?? []).map((c) => [c.id, c.name])), [clients])

  const sections = useMemo(() => {
    const today = todayISO()
    const list = workouts ?? []
    const overdue: Workout[] = []
    const todayList: Workout[] = []
    const upcoming: Workout[] = []
    const recent: Workout[] = []
    for (const w of list) {
      if (w.date === today) todayList.push(w)
      else if (w.status === 'planned' && w.date < today) overdue.push(w)
      else if (w.status === 'planned') upcoming.push(w)
      else recent.push(w)
    }
    recent.reverse()
    return [
      { key: 'today', title: 'Сегодня', items: todayList, hint: undefined },
      {
        key: 'overdue',
        title: 'Не отмечены',
        items: overdue,
        hint: 'Запланированы на прошедшие даты — отметьте проведёнными или перенесите',
      },
      { key: 'upcoming', title: 'Предстоящие', items: upcoming, hint: undefined },
      { key: 'recent', title: 'Недавно проведённые', items: recent.slice(0, RECENT_LIMIT), hint: undefined },
    ].filter((s) => s.items.length > 0)
  }, [workouts])

  const loading = workouts === undefined || clients === undefined

  return (
    <>
      <PageHeader large title="Тренировки" subtitle="Расписание и история по всем клиентам" />
      <div className={styles.page}>
        {loading && (
          <div className={styles.loading}>
            <Skeleton className={styles.skeletonLabel} />
            <Skeleton className={styles.skeletonCard} />
            <Skeleton className={styles.skeletonCard} />
          </div>
        )}
        {!loading && sections.length === 0 && (
          <EmptyState
            icon={CalendarDays}
            title="Тренировок пока нет"
            description={
              clients.length
                ? 'Откройте профиль клиента и составьте для него первую тренировку.'
                : 'Сначала добавьте клиента — затем составьте для него план.'
            }
            action={
              <Link to="/" className={clsx(buttonVariants({ variant: 'outline', size: 'lg' }), styles.clientsLink)}>
                К клиентам
              </Link>
            }
          />
        )}
        {sections.map((section) => (
          <section key={section.key} className={styles.section}>
            <div>
              <h2 className={styles.heading}>
                {section.title}
                <span className={styles.count}>{section.items.length}</span>
              </h2>
              {section.hint && <p className={styles.hint}>{section.hint}</p>}
            </div>
            {section.items.map((w) => (
              <WorkoutCard key={w.id} workout={w} clientName={names.get(w.clientId) ?? 'Удалённый клиент'} />
            ))}
          </section>
        ))}
      </div>
    </>
  )
}
