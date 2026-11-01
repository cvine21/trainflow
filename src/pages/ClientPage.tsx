import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  AlertTriangle,
  CalendarPlus,
  ChevronRight,
  ClipboardList,
  History,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  UserX,
} from 'lucide-react'
import { toast } from 'sonner'
import { db, deleteClientCascade, type Measurement } from '@/lib/db'
import { addDaysISO, ageFromBirthDate, countLabel, formatDate, formatNumber, todayISO } from '@/lib/format'
import { MEASUREMENT_FIELDS, type MeasurementField } from '@/lib/measurements'
import { compareWorkouts, exerciseProgress } from '@/lib/workouts'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ClientAvatar } from '@/components/ClientAvatar'
import { WorkoutCard } from '@/components/WorkoutCard'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ClientMeasurements } from '@/components/ClientMeasurements'
import { ExerciseProgressSheet } from '@/components/ExerciseProgressSheet'
import { MeasurementSheet } from '@/components/MeasurementSheet'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type Tab = 'plan' | 'history' | 'progress' | 'measurements'

function latestValues(list: Measurement[], fromIndex: number): Partial<Record<MeasurementField, number>> {
  const out: Partial<Record<MeasurementField, number>> = {}
  for (const f of MEASUREMENT_FIELDS) {
    const m = list.slice(fromIndex).find((x) => x[f.key] != null)
    if (m) out[f.key] = m[f.key]!
  }
  return out
}

export function ClientPage() {
  const { clientId = '' } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'plan'
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [progressKey, setProgressKey] = useState<string | null>(null)
  const [measurementSheet, setMeasurementSheet] = useState<{ measurement: Measurement | null } | null>(null)

  const client = useLiveQuery(async () => (await db.clients.get(clientId)) ?? null, [clientId])
  const workouts = useLiveQuery(
    () => db.workouts.where('[clientId+date]').between([clientId, ''], [clientId, '\uffff']).toArray(),
    [clientId],
  )
  const measurements = useLiveQuery(
    async () =>
      (await db.measurements.where('clientId').equals(clientId).toArray()).sort(
        (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
      ),
    [clientId],
  )

  const { planned, history, stats, progress } = useMemo(() => {
    const list = workouts ?? []
    const planned = list.filter((w) => w.status === 'planned').sort(compareWorkouts)
    const history = list.filter((w) => w.status === 'completed').sort((a, b) => compareWorkouts(b, a))
    const monthAgo = addDaysISO(todayISO(), -30)
    return {
      planned,
      history,
      stats: {
        total: history.length,
        month: history.filter((w) => w.date >= monthAgo).length,
        last: history[0]?.date,
      },
      progress: exerciseProgress(list),
    }
  }, [workouts])

  if (client === null) {
    return (
      <>
        <PageHeader title="Клиент" backTo="/" />
        <EmptyState
          icon={UserX}
          title="Клиент не найден"
          description="Возможно, он был удалён."
          action={
            <Link to="/" className={buttonVariants({ variant: 'outline' })}>
              К списку клиентов
            </Link>
          }
        />
      </>
    )
  }

  const age = ageFromBirthDate(client?.birthDate)
  const newWorkoutHref = `/clients/${clientId}/workouts/new`
  const selectedProgress = progress.find((p) => p.key === progressKey) ?? null
  const editingIndex = measurementSheet?.measurement
    ? (measurements ?? []).findIndex((m) => m.id === measurementSheet.measurement!.id)
    : -1

  return (
    <>
      <PageHeader
        title={client ? client.name : <Skeleton className="h-5 w-40" />}
        backTo="/"
        actions={
          client && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" aria-label="Действия" />}>
                <MoreVertical className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem className="h-10" onClick={() => navigate(`/clients/${clientId}/edit`)}>
                  <Pencil /> Редактировать профиль
                </DropdownMenuItem>
                <DropdownMenuItem className="h-10" onClick={() => navigate(newWorkoutHref)}>
                  <CalendarPlus /> Новая тренировка
                </DropdownMenuItem>
                <DropdownMenuItem className="h-10" onClick={() => setMeasurementSheet({ measurement: null })}>
                  <Plus /> Добавить замер
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="h-10" variant="destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 /> Удалить клиента
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />

      <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
        {client ? (
          <section className="rounded-2xl border border-border/70 bg-card p-4">
            <div className="flex items-center gap-3">
              <ClientAvatar name={client.name} className="size-14 text-lg" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold">{client.name}</h2>
                <div className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                  {age !== null && <span>{countLabel(age, ['год', 'года', 'лет'])}</span>}
                  {client.phone && (
                    <a
                      href={`tel:${client.phone.replace(/[^\d+]/g, '')}`}
                      className="inline-flex items-center gap-1 text-primary"
                    >
                      <Phone className="size-3.5" /> {client.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {(client.goal || client.health || client.notes) && (
              <div className="mt-4 flex flex-col gap-3 text-sm">
                {client.goal && (
                  <InfoRow icon={Target} label="Цель">
                    {client.goal}
                  </InfoRow>
                )}
                {client.health && (
                  <div className="flex gap-2.5 rounded-xl bg-amber-50 p-3 text-amber-900">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    <div>
                      <div className="text-xs font-medium text-amber-700">Здоровье и ограничения</div>
                      <p className="whitespace-pre-wrap">{client.health}</p>
                    </div>
                  </div>
                )}
                {client.notes && (
                  <InfoRow icon={ClipboardList} label="Заметки">
                    {client.notes}
                  </InfoRow>
                )}
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 divide-x divide-border/70 rounded-xl bg-muted/60 py-3 text-center">
              <Stat value={stats.total} label="всего" />
              <Stat value={stats.month} label="за 30 дней" />
              <Stat value={stats.last ? formatDate(stats.last, { weekday: false }) : '—'} label="последняя" small />
            </div>
          </section>
        ) : (
          <Skeleton className="h-48 rounded-2xl" />
        )}

        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v as string }, { replace: true })}>
          <TabsList className="h-11! w-full rounded-xl">
            <TabsTrigger value="plan" className="rounded-lg px-1">
              План{planned.length > 0 && <CountPill n={planned.length} />}
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg px-1">
              История{history.length > 0 && <CountPill n={history.length} />}
            </TabsTrigger>
            <TabsTrigger value="progress" className="rounded-lg px-1">
              Прогресс
            </TabsTrigger>
            <TabsTrigger value="measurements" className="rounded-lg px-1">
              Замеры
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plan" className="mt-1 flex flex-col gap-2">
            {workouts === undefined && <ListSkeleton />}
            {workouts && planned.length === 0 && (
              <EmptyState
                icon={CalendarPlus}
                title="Запланированных тренировок нет"
                description="Составьте план на следующее занятие — его можно будет поправить в любой момент."
                className="py-8"
              />
            )}
            {planned.map((w) => (
              <WorkoutCard key={w.id} workout={w} showStatus={w.date < todayISO()} />
            ))}
          </TabsContent>

          <TabsContent value="history" className="mt-1 flex flex-col gap-2">
            {workouts === undefined && <ListSkeleton />}
            {workouts && history.length === 0 && (
              <EmptyState
                icon={History}
                title="История пока пуста"
                description="Когда вы отметите тренировку проведённой, она появится здесь."
                className="py-8"
              />
            )}
            {history.map((w) => (
              <WorkoutCard key={w.id} workout={w} showStatus={false} />
            ))}
          </TabsContent>

          <TabsContent value="progress" className="mt-1 flex flex-col gap-2">
            {workouts && progress.length === 0 && (
              <EmptyState
                icon={TrendingUp}
                title="Пока нечего сравнивать"
                description="Здесь появятся лучшие подходы и расчётный максимум по каждому упражнению."
                className="py-8"
              />
            )}
            {progress.length > 0 && (
              <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
                {progress.map((p) => {
                  const last = p.sessions.at(-1)!
                  return (
                    <li key={p.key}>
                      <button
                        type="button"
                        onClick={() => setProgressKey(p.key)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/60"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{p.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            <span className="lowercase">{formatDate(last.date, { weekday: false })}</span>:{' '}
                            {last.summary} · {countLabel(p.sessions.length, ['раз', 'раза', 'раз'])}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold">{p.bestLabel}</div>
                          {p.bestE1rm != null && (
                            <div className="text-[11px] text-muted-foreground">
                              ≈ 1ПМ {formatNumber(Math.round(p.bestE1rm))} кг
                            </div>
                          )}
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="measurements" className="mt-1 flex flex-col gap-2">
            {measurements === undefined && <ListSkeleton />}
            {measurements && (
              <ClientMeasurements
                measurements={measurements}
                onOpen={(measurement) => setMeasurementSheet({ measurement })}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {client && (
        <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg px-4">
          {tab === 'measurements' ? (
            <Button
              size="lg"
              className="pointer-events-auto mb-4 h-12 w-full rounded-2xl text-base shadow-lg shadow-primary/25"
              onClick={() => setMeasurementSheet({ measurement: null })}
            >
              <Plus className="size-5" /> Добавить замер
            </Button>
          ) : (
            <Link
              to={newWorkoutHref}
              className={cn(
                buttonVariants({ size: 'lg' }),
                'pointer-events-auto mb-4 h-12 w-full rounded-2xl text-base shadow-lg shadow-primary/25',
              )}
            >
              <CalendarPlus className="size-5" /> Новая тренировка
            </Link>
          )}
        </div>
      )}

      <ExerciseProgressSheet progress={selectedProgress} onClose={() => setProgressKey(null)} />

      <MeasurementSheet
        open={measurementSheet !== null}
        onOpenChange={(open) => !open && setMeasurementSheet(null)}
        clientId={clientId}
        measurement={measurementSheet?.measurement}
        previous={latestValues(measurements ?? [], editingIndex >= 0 ? editingIndex + 1 : 0)}
      />

      {client && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Удалить ${client.name}?`}
          description={`Будут удалены профиль, ${countLabel(workouts?.length ?? 0, ['тренировка', 'тренировки', 'тренировок'])} и замеры. Это действие нельзя отменить.`}
          onConfirm={async () => {
            await deleteClientCascade(client.id)
            toast.success('Клиент удалён')
            navigate('/', { replace: true })
          }}
        />
      )}
    </>
  )
}

function InfoRow({ icon: Icon, label, children }: { icon: typeof Target; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <p className="whitespace-pre-wrap">{children}</p>
      </div>
    </div>
  )
}

function Stat({ value, label, small }: { value: number | string; label: string; small?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-1">
      <span className={cn('font-semibold tabular-nums', small ? 'text-sm leading-6' : 'text-lg leading-6')}>
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}

function CountPill({ n }: { n: number }) {
  return (
    <span className="rounded-full bg-muted px-1.5 text-[11px] leading-4 text-muted-foreground tabular-nums">{n}</span>
  )
}

function ListSkeleton() {
  return (
    <>
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </>
  )
}
