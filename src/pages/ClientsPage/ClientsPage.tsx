import { Button, buttonVariants } from '@/components/Button'
import { ClientAvatar } from '@/components/ClientAvatar'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/Input'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { db, type Workout } from '@/lib/db'
import { loadDemoData } from '@/lib/demo'
import { formatDate, todayISO } from '@/lib/format'
import { compareWorkouts, formatWhen } from '@/lib/workouts'
import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, ChevronRight, CircleUser, Plus, Search, Sparkles, UserPlus, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import styles from './ClientsPage.module.css'

interface ClientMeta {
  last?: Workout
  next?: Workout
}

export function ClientsPage() {
  const [query, setQuery] = useState('')
  const clients = useLiveQuery(() => db.clients.orderBy('name').toArray(), [])
  const workouts = useLiveQuery(() => db.workouts.toArray(), [])

  const meta = useMemo(() => {
    const map = new Map<string, ClientMeta>()
    const today = todayISO()
    for (const w of workouts ?? []) {
      const m = map.get(w.clientId) ?? {}
      if (w.status === 'completed') {
        if (!m.last || compareWorkouts(w, m.last) > 0) m.last = w
      } else if (w.date >= today && (!m.next || compareWorkouts(w, m.next) < 0)) {
        m.next = w
      }
      map.set(w.clientId, m)
    }
    return map
  }, [workouts])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!clients) return undefined
    if (!q) return clients
    const digits = q.replace(/\D/g, '')
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.goal?.toLowerCase().includes(q) ||
        (digits.length > 0 && c.phone?.replace(/\D/g, '').includes(digits)),
    )
  }, [clients, query])

  const loading = clients === undefined || workouts === undefined

  return (
    <>
      <PageHeader
        large
        title="Клиенты"
        subtitle={clients?.length ? `${clients.length} в базе` : undefined}
        actions={
          <>
            <Link
              to="/account"
              className={clsx(buttonVariants({ variant: 'ghost', size: 'icon-lg' }), styles.roundIcon)}
              aria-label="Аккаунт"
            >
              <CircleUser className={styles.iconMd} />
            </Link>
            <Link
              to="/clients/new"
              className={clsx(buttonVariants({ size: 'icon-lg' }), styles.roundIcon)}
              aria-label="Добавить клиента"
            >
              <UserPlus className={styles.iconMd} />
            </Link>
          </>
        }
      />

      {!!clients?.length && (
        <div className={styles.searchWrap}>
          <div className={styles.search}>
            <Search className={styles.searchIcon} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по имени, телефону, цели"
              className={styles.searchInput}
              type="search"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className={styles.clear} aria-label="Очистить поиск">
                <X className={styles.icon} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className={styles.list}>
        {loading &&
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={styles.skeletonRow}>
              <Skeleton className={styles.skeletonAvatar} />
              <div className={styles.skeletonText}>
                <Skeleton className={styles.skeletonLine} />
                <Skeleton className={styles.skeletonLineShort} />
              </div>
            </div>
          ))}

        {!loading && clients.length === 0 && (
          <EmptyState
            icon={Users}
            title="Пока нет ни одного клиента"
            description="Добавьте первого клиента, чтобы составлять для него тренировки и вести историю."
            action={
              <>
                <Link to="/clients/new" className={clsx(buttonVariants({ size: 'lg' }), styles.addClient)}>
                  <Plus /> Добавить клиента
                </Link>
                {import.meta.env.DEV && (
                  <Button
                    variant="ghost"
                    className={styles.demo}
                    onClick={async () => {
                      await loadDemoData()
                      toast.success('Добавлены демо-клиенты с тренировками')
                    }}
                  >
                    <Sparkles /> Заполнить примером
                  </Button>
                )}
              </>
            }
          />
        )}

        {!loading && clients.length > 0 && filtered?.length === 0 && (
          <EmptyState icon={Search} title="Никого не нашли" description={`По запросу «${query}» клиентов нет.`} />
        )}

        {filtered?.map((client) => {
          const m = meta.get(client.id)
          return (
            <Link key={client.id} to={`/clients/${client.id}`} className={styles.card}>
              <ClientAvatar name={client.name} />
              <div className={styles.body}>
                <div className={styles.nameRow}>
                  <span className={styles.name}>{client.name}</span>
                  {client.health?.trim() && <AlertTriangle className={styles.iconXs} aria-label="Есть ограничения" />}
                </div>
                {client.goal && <p className={styles.goal}>{client.goal}</p>}
                <div className={styles.meta}>
                  {m?.next && (
                    <span className={styles.next}>
                      Следующая: <span className={styles.lower}>{formatWhen(m.next, { weekday: false })}</span>
                    </span>
                  )}
                  <span>
                    {m?.last ? (
                      <>
                        Была: <span className={styles.lower}>{formatDate(m.last.date, { weekday: false })}</span>
                      </>
                    ) : (
                      'Ещё не тренировался'
                    )}
                  </span>
                </div>
              </div>
              <ChevronRight className={styles.chevron} />
            </Link>
          )
        })}
      </div>
    </>
  )
}
