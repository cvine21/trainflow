import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, ChevronRight, Plus, Search, Sparkles, UserPlus, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { db, type Workout } from '@/lib/db'
import { formatDate, todayISO } from '@/lib/format'
import { loadDemoData } from '@/lib/demo'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ClientAvatar } from '@/components/ClientAvatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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
        if (!m.last || w.date > m.last.date) m.last = w
      } else if (w.date >= today && (!m.next || w.date < m.next.date)) {
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
          <Link
            to="/clients/new"
            className={cn(buttonVariants({ size: 'icon-lg' }), 'rounded-full')}
            aria-label="Добавить клиента"
          >
            <UserPlus className="size-5" />
          </Link>
        }
      />

      {!!clients?.length && (
        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по имени, телефону, цели"
              className="h-11 rounded-xl bg-card pr-9 pl-9"
              type="search"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
                aria-label="Очистить поиск"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 px-4 py-3">
        {loading &&
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4">
              <Skeleton className="size-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
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
                <Link to="/clients/new" className={cn(buttonVariants({ size: 'lg' }), 'h-11 px-5')}>
                  <Plus /> Добавить клиента
                </Link>
                <Button
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={async () => {
                    await loadDemoData()
                    toast.success('Добавлены демо-клиенты с тренировками')
                  }}
                >
                  <Sparkles /> Заполнить примером
                </Button>
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
            <Link
              key={client.id}
              to={`/clients/${client.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5 transition-colors active:bg-muted/60"
            >
              <ClientAvatar name={client.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-semibold">{client.name}</span>
                  {client.health?.trim() && (
                    <AlertTriangle className="size-3.5 shrink-0 text-amber-500" aria-label="Есть ограничения" />
                  )}
                </div>
                {client.goal && <p className="truncate text-sm text-muted-foreground">{client.goal}</p>}
                <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {m?.next && (
                    <span className="font-medium text-primary">
                      Следующая: <span className="lowercase">{formatDate(m.next.date, { weekday: false })}</span>
                    </span>
                  )}
                  <span>
                    {m?.last ? (
                      <>
                        Была: <span className="lowercase">{formatDate(m.last.date, { weekday: false })}</span>
                      </>
                    ) : (
                      'Ещё не тренировался'
                    )}
                  </span>
                </div>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground/60" />
            </Link>
          )
        })}
      </div>
    </>
  )
}
