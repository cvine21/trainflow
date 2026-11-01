import { useMemo } from 'react'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays } from 'lucide-react'
import { db, type Workout } from '@/lib/db'
import { todayISO } from '@/lib/format'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { WorkoutCard } from '@/components/WorkoutCard'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const RECENT_LIMIT = 30

export function WorkoutsPage() {
  const workouts = useLiveQuery(() => db.workouts.orderBy('date').toArray(), [])
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
      <div className="flex flex-col gap-5 px-4 py-4">
        {loading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
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
              <Link to="/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                К клиентам
              </Link>
            }
          />
        )}
        {sections.map((section) => (
          <section key={section.key} className="flex flex-col gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                {section.title}
                <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums">{section.items.length}</span>
              </h2>
              {section.hint && <p className="mt-0.5 text-xs text-muted-foreground">{section.hint}</p>}
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
