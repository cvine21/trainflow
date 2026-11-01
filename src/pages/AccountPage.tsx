import { useEffect, useRef, useState } from 'react'
import { Cloud, Download, LoaderCircle, LogOut, RefreshCw, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { countLabel } from '@/lib/format'
import { exportBackup, importBackup } from '@/lib/backup'
import { isOnline } from '@/lib/pwa'
import { getLastSyncedAt, hydrateFromRemote, runSync, subscribeSyncStatus, type SyncStatus } from '@/lib/sync'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'

export function AccountPage() {
  const { configured, user, session, signOut } = useAuth()
  const [online, setOnline] = useState(() => isOnline())
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(configured ? 'idle' : 'unconfigured')
  const [syncError, setSyncError] = useState<string | undefined>()
  const [lastSynced, setLastSynced] = useState(() => getLastSyncedAt())
  const [syncBusy, setSyncBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(
    () =>
      subscribeSyncStatus((status, error) => {
        setSyncStatus(status)
        setSyncError(error)
        if (status === 'ok') setLastSynced(getLastSyncedAt())
      }),
    [],
  )

  async function handleSync() {
    if (!session) return
    setSyncBusy(true)
    try {
      const snap = await hydrateFromRemote(session)
      const res = await runSync(session)
      setLastSynced(getLastSyncedAt())
      toast.success(`Из облака: ${snap.clients} кл., ${snap.workouts} тр. · отправлено ↑${res.pushed}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка синхронизации')
    } finally {
      setSyncBusy(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
      toast.success('Вы вышли из аккаунта')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось выйти')
    }
  }

  const syncLabel = !online
    ? 'Офлайн — синк при появлении сети'
    : syncStatus === 'syncing' || syncBusy
      ? 'Синхронизация…'
      : syncStatus === 'error'
        ? syncError || 'Ошибка синхронизации'
        : lastSynced
          ? `Обновлено ${new Date(lastSynced).toLocaleString('ru-RU')}`
          : 'Ещё не синхронизировали'

  return (
    <>
      <PageHeader title="Аккаунт" backTo="/" />
      <div className="flex flex-col gap-4 px-4 py-4">
        <section className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Cloud className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-semibold">{user?.email ?? 'Аккаунт'}</h2>
              <p className="text-sm text-muted-foreground">{configured ? syncLabel : 'Облако не настроено'}</p>
            </div>
          </div>

          {configured && user && (
            <div className="mt-4 flex flex-col gap-2">
              <Button
                variant="outline"
                className="h-12 justify-start gap-3 rounded-xl bg-background px-4 text-base"
                onClick={handleSync}
                disabled={!online || syncBusy || syncStatus === 'syncing'}
              >
                {syncBusy || syncStatus === 'syncing' ? (
                  <LoaderCircle className="size-5 animate-spin text-primary" />
                ) : (
                  <RefreshCw className="size-5 text-primary" />
                )}
                Синхронизировать сейчас
              </Button>
              <Button
                variant="ghost"
                className="h-11 justify-start gap-3 text-muted-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="size-5" /> Выйти
              </Button>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Резервная копия</h2>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3 rounded-xl bg-card px-4 text-base"
            onClick={async () => {
              await exportBackup()
              toast.success('Файл резервной копии сохранён')
            }}
          >
            <Download className="size-5 text-primary" /> Скачать копию (.json)
          </Button>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3 rounded-xl bg-card px-4 text-base"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-5 text-primary" /> Восстановить из файла
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                const res = await importBackup(file)
                toast.success(
                  `Загружено: ${countLabel(res.clients, ['клиент', 'клиента', 'клиентов'])}, ${countLabel(res.workouts, ['тренировка', 'тренировки', 'тренировок'])}`,
                )
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Не удалось прочитать файл')
              }
            }}
          />
          <p className="px-1 text-xs text-muted-foreground">
            На случай сбоя облака. После восстановления нажмите «Синхронизировать сейчас», чтобы отправить данные в
            Supabase.
          </p>
        </section>
      </div>
    </>
  )
}
