import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader'
import { useAuth } from '@/lib/auth'
import { exportBackup, importBackup } from '@/lib/backup'
import { countLabel } from '@/lib/format'
import { isOnline } from '@/lib/pwa'
import { getLastSyncedAt, hydrateFromRemote, runSync, subscribeSyncStatus, type SyncStatus } from '@/lib/sync'
import clsx from 'clsx'
import { Cloud, Download, LoaderCircle, LogOut, RefreshCw, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import styles from './AccountPage.module.css'

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
      <div className={styles.page}>
        <section className={styles.card}>
          <div className={styles.account}>
            <div className={styles.cloud}>
              <Cloud className={styles.iconMd} />
            </div>
            <div className={styles.accountBody}>
              <h2 className={styles.email}>{user?.email ?? 'Аккаунт'}</h2>
              <p className={styles.status}>{configured ? syncLabel : 'Облако не настроено'}</p>
            </div>
          </div>

          {configured && user && (
            <div className={styles.actions}>
              <Button
                variant="outline"
                className={clsx(styles.rowButton, styles.syncButton)}
                onClick={handleSync}
                disabled={!online || syncBusy || syncStatus === 'syncing'}
              >
                {syncBusy || syncStatus === 'syncing' ? (
                  <LoaderCircle className={clsx(styles.iconMd, styles.spin, styles.primary)} />
                ) : (
                  <RefreshCw className={clsx(styles.iconMd, styles.primary)} />
                )}
                Синхронизировать сейчас
              </Button>
              <Button variant="ghost" className={styles.signOut} onClick={handleSignOut}>
                <LogOut className={styles.iconMd} /> Выйти
              </Button>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>Резервная копия</h2>
          <Button
            variant="outline"
            className={styles.rowButton}
            onClick={async () => {
              await exportBackup()
              toast.success('Файл резервной копии сохранён')
            }}
          >
            <Download className={clsx(styles.iconMd, styles.primary)} /> Скачать копию (.json)
          </Button>
          <Button variant="outline" className={styles.rowButton} onClick={() => fileRef.current?.click()}>
            <Upload className={clsx(styles.iconMd, styles.primary)} /> Восстановить из файла
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className={styles.file}
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
          <p className={styles.note}>
            На случай сбоя облака. После восстановления нажмите «Синхронизировать сейчас», чтобы отправить данные в
            Supabase.
          </p>
        </section>
      </div>
    </>
  )
}
