import { Button, buttonVariants } from '@/components/Button'
import { ClientAvatar } from '@/components/ClientAvatar'
import { ClientMeasurements } from '@/components/ClientMeasurements'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu'
import { EmptyState } from '@/components/EmptyState'
import { ExerciseProgressSheet } from '@/components/ExerciseProgressSheet'
import { MeasurementSheet } from '@/components/MeasurementSheet'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/Tabs'
import { WorkoutCard } from '@/components/WorkoutCard'
import { db, deleteClientCascade, type Measurement } from '@/lib/db'
import { addDaysISO, ageFromBirthDate, countLabel, formatDate, formatNumber, todayISO } from '@/lib/format'
import { MEASUREMENT_FIELDS, type MeasurementField } from '@/lib/measurements'
import { compareWorkouts, exerciseProgress } from '@/lib/workouts'
import clsx from 'clsx'
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
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import styles from './ClientPage.module.css'

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
            <Link to="/" className={clsx(buttonVariants({ variant: 'outline' }), styles.outlineLink)}>
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
        title={client ? client.name : <Skeleton className={styles.titleSkeleton} />}
        backTo="/"
        actions={
          client && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" aria-label="Действия" />}>
                <MoreVertical className={styles.iconMd} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={styles.menu}>
                <DropdownMenuItem className={styles.menuItem} onClick={() => navigate(`/clients/${clientId}/edit`)}>
                  <Pencil /> Редактировать профиль
                </DropdownMenuItem>
                <DropdownMenuItem className={styles.menuItem} onClick={() => navigate(newWorkoutHref)}>
                  <CalendarPlus /> Новая тренировка
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={styles.menuItem}
                  onClick={() => setMeasurementSheet({ measurement: null })}
                >
                  <Plus /> Добавить замер
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className={styles.menuItem}
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 /> Удалить клиента
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />

      <div className={styles.page}>
        {client ? (
          <section className={styles.card}>
            <div className={styles.profile}>
              <ClientAvatar name={client.name} className={styles.avatar} />
              <div className={styles.profileBody}>
                <h2 className={styles.name}>{client.name}</h2>
                <div className={styles.meta}>
                  {age !== null && <span>{countLabel(age, ['год', 'года', 'лет'])}</span>}
                  {client.phone && (
                    <a href={`tel:${client.phone.replace(/[^\d+]/g, '')}`} className={styles.phone}>
                      <Phone className={styles.iconSm} /> {client.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {(client.goal || client.health || client.notes) && (
              <div className={styles.details}>
                {client.goal && (
                  <InfoRow icon={Target} label="Цель">
                    {client.goal}
                  </InfoRow>
                )}
                {client.health && (
                  <div className={styles.health}>
                    <AlertTriangle className={styles.healthIcon} />
                    <div>
                      <div className={styles.healthLabel}>Здоровье и ограничения</div>
                      <p className={styles.pre}>{client.health}</p>
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

            <div className={styles.stats}>
              <Stat value={stats.total} label="всего" />
              <Stat value={stats.month} label="за 30 дней" />
              <Stat value={stats.last ? formatDate(stats.last, { weekday: false }) : '—'} label="последняя" small />
            </div>
          </section>
        ) : (
          <Skeleton className={styles.profileSkeleton} />
        )}

        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v as string }, { replace: true })}>
          <TabsList className={styles.tabs}>
            <TabsTrigger value="plan" className={styles.trigger}>
              План{planned.length > 0 && <CountPill n={planned.length} />}
            </TabsTrigger>
            <TabsTrigger value="history" className={styles.trigger}>
              История{history.length > 0 && <CountPill n={history.length} />}
            </TabsTrigger>
            <TabsTrigger value="progress" className={styles.trigger}>
              Прогресс
            </TabsTrigger>
            <TabsTrigger value="measurements" className={styles.trigger}>
              Замеры
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plan" className={styles.panel}>
            {workouts === undefined && <ListSkeleton />}
            {workouts && planned.length === 0 && (
              <EmptyState
                icon={CalendarPlus}
                title="Запланированных тренировок нет"
                description="Составьте план на следующее занятие — его можно будет поправить в любой момент."
                className={styles.emptyTight}
              />
            )}
            {planned.map((w) => (
              <WorkoutCard key={w.id} workout={w} showStatus={w.date < todayISO()} />
            ))}
          </TabsContent>

          <TabsContent value="history" className={styles.panel}>
            {workouts === undefined && <ListSkeleton />}
            {workouts && history.length === 0 && (
              <EmptyState
                icon={History}
                title="История пока пуста"
                description="Когда вы отметите тренировку проведённой, она появится здесь."
                className={styles.emptyTight}
              />
            )}
            {history.map((w) => (
              <WorkoutCard key={w.id} workout={w} showStatus={false} />
            ))}
          </TabsContent>

          <TabsContent value="progress" className={styles.panel}>
            {workouts && progress.length === 0 && (
              <EmptyState
                icon={TrendingUp}
                title="Пока нечего сравнивать"
                description="Здесь появятся лучшие подходы и расчётный максимум по каждому упражнению."
                className={styles.emptyTight}
              />
            )}
            {progress.length > 0 && (
              <ul className={styles.progress}>
                {progress.map((p) => {
                  const last = p.sessions.at(-1)!
                  return (
                    <li key={p.key}>
                      <button type="button" onClick={() => setProgressKey(p.key)} className={styles.progressButton}>
                        <div className={styles.progressBody}>
                          <div className={styles.progressName}>{p.name}</div>
                          <div className={styles.progressMeta}>
                            <span className={styles.lower}>{formatDate(last.date, { weekday: false })}</span>:{' '}
                            {last.summary} · {countLabel(p.sessions.length, ['раз', 'раза', 'раз'])}
                          </div>
                        </div>
                        <div className={styles.best}>
                          <div className={styles.bestValue}>{p.bestLabel}</div>
                          {p.bestE1rm != null && (
                            <div className={styles.e1rm}>≈ 1ПМ {formatNumber(Math.round(p.bestE1rm))} кг</div>
                          )}
                        </div>
                        <ChevronRight className={styles.chevron} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="measurements" className={styles.panel}>
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
        <div className={styles.fabWrap}>
          {tab === 'measurements' ? (
            <Button size="lg" className={styles.fab} onClick={() => setMeasurementSheet({ measurement: null })}>
              <Plus className={styles.iconMd} /> Добавить замер
            </Button>
          ) : (
            <Link to={newWorkoutHref} className={clsx(buttonVariants({ size: 'lg' }), styles.fab)}>
              <CalendarPlus className={styles.iconMd} /> Новая тренировка
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
    <div className={styles.info}>
      <Icon className={styles.infoIcon} />
      <div className={styles.infoBody}>
        <div className={styles.infoLabel}>{label}</div>
        <p className={styles.pre}>{children}</p>
      </div>
    </div>
  )
}

function Stat({ value, label, small }: { value: number | string; label: string; small?: boolean }) {
  return (
    <div className={styles.stat}>
      <span className={clsx(styles.statValue, small && styles.statValueSmall)}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}

function CountPill({ n }: { n: number }) {
  return <span className={styles.count}>{n}</span>
}

function ListSkeleton() {
  return (
    <>
      <Skeleton className={styles.listSkeleton} />
      <Skeleton className={styles.listSkeleton} />
    </>
  )
}
